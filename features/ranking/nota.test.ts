import { describe, expect, it } from 'vitest';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { periodoPadrao } from '@/features/metricas/periodo';
import { carregarDadosTv } from '@/features/tv/consultas';
import { carregarRanking } from './consultas';

usarBancoLimpo();

function admin(id: string): UsuarioSessao {
  return {
    id,
    nome: 'Admin',
    perfil: 'Administrador',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: resolverPermissoes('Administrador', []),
    ehAprovadorDelegado: false,
  };
}

let seq = 0;
async function concluida(editorId: string, extra: { formato?: string; completada?: string } = {}) {
  seq += 1;
  const id = `LFnr${String(seq).padStart(6, '0')}`;
  const sql = sqlTeste();
  await sql`
    INSERT INTO demands (id, title, format, status, editor_id, completed_at, created_by)
    VALUES (${id}, ${`Peça ${seq}`}, ${extra.formato ?? 'Reels'}, 'Concluída', ${editorId},
            ${extra.completada ?? new Date().toISOString()}, ${editorId})`;
  return id;
}

describe('/ranking: nota e posição', () => {
  it('a nota e a ordem do /ranking são as da TV para o mesmo mês', async () => {
    const adm = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Nota' });
    const alfa = await criarUsuario({ perfil: 'Editor', nome: 'Editor Alfa' });
    const beta = await criarUsuario({ perfil: 'Editor', nome: 'Editor Beta' });
    const solo = await criarUsuario({ perfil: 'Editor', nome: 'Editor Solo' });
    const staff = await criarUsuario({ perfil: 'Editor', nome: 'Pessoa Staff' });
    const sql = sqlTeste();
    await sql`INSERT INTO user_permissions (user_id, permission_key, granted)
              VALUES (${staff.id}, 'notaInformativaRanking', true)`;

    const ida1 = await concluida(alfa.id);
    await concluida(alfa.id);
    await concluida(alfa.id);
    await concluida(beta.id);
    await concluida(beta.id);
    await concluida(solo.id);
    await concluida(staff.id);
    // Alfa teve um ajuste pedido numa das entregas: perde a aprovação direta dessa peça.
    await sql`INSERT INTO deliveries (id, demand_id, version, link, editor_id, status, reason)
              VALUES ('ENT-nr-1', ${ida1}, 1, 'https://exemplo.test/a', ${alfa.id}, 'Ajustes solicitados', 'ajuste')`;

    const tv = (await carregarDadosTv(sql)).ranking.map((item) => ({
      editor: String(item.editor),
      nota: Number(item.nota),
    }));
    const linhas = await carregarRanking(admin(adm.id), periodoPadrao());

    expect(linhas.length).toBe(4);
    for (const linha of linhas) {
      const daTv = tv.find((item) => item.editor === linha.nome);
      expect(daTv, `${linha.nome} está na TV`).toBeDefined();
      expect(linha.nota).toBe(daTv!.nota);
    }
    // Posição: quem tem 2+ entregas disputa; Solo (1) e staff ficam sem posição.
    const porNome = Object.fromEntries(linhas.map((l) => [l.nome, l]));
    expect(porNome['Editor Alfa']!.posicao).toBe(1); // 3 peças pesam mais que 2, mesmo com um ajuste
    expect(porNome['Editor Beta']!.posicao).toBe(2);
    expect(porNome['Editor Solo']!.posicao).toBeNull();
    expect(porNome['Pessoa Staff']!.posicao).toBeNull();
    expect(porNome['Pessoa Staff']!.staff).toBe(true);
    // Ordem das linhas: posicionados primeiro.
    expect(linhas.slice(0, 2).map((l) => l.nome)).toEqual(['Editor Alfa', 'Editor Beta']);
  });

  it('só considera o período escolhido', async () => {
    const adm = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Período' });
    const ed = await criarUsuario({ perfil: 'Editor', nome: 'Editor Período' });
    await concluida(ed.id, { completada: '2020-01-10T15:00:00-03:00' });
    await concluida(ed.id, { completada: '2020-01-20T15:00:00-03:00' });
    await concluida(ed.id, { completada: '2020-02-02T15:00:00-03:00' });

    const janeiro = await carregarRanking(admin(adm.id), { inicio: '2020-01-01', fim: '2020-01-31' });
    expect(janeiro).toHaveLength(1);
    expect(janeiro[0]).toMatchObject({ concluidas: 2, posicao: 1 });
    expect(janeiro[0]!.nota).toBeGreaterThan(0);

    const marco = await carregarRanking(admin(adm.id), { inicio: '2020-03-01', fim: '2020-03-31' });
    expect(marco).toEqual([]);
  });

  it('o /ranking lista todos os disputantes, sem o corte de 7 do slide da TV', async () => {
    const adm = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Corte' });
    const periodo = { inicio: '2020-05-01', fim: '2020-05-31' };
    for (let i = 1; i <= 9; i += 1) {
      const ed = await criarUsuario({ perfil: 'Editor', nome: `Editor ${i}` });
      await concluida(ed.id, { completada: '2020-05-10T15:00:00-03:00' });
      await concluida(ed.id, { completada: '2020-05-11T15:00:00-03:00' });
    }
    const linhas = await carregarRanking(admin(adm.id), periodo);
    expect(linhas).toHaveLength(9);
    expect(linhas.map((l) => l.posicao)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
