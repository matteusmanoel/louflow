import { describe, expect, it } from 'vitest';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { transicionarStatus } from '@/features/status';
import {
  listarDemandasAtrasadas,
  produtividadePorEditor,
  resumoDoDia,
  tempoMedioEdicao,
} from '@/features/metricas/consultas';
import { hojeSaoPaulo } from '@/features/metricas/periodo';
import { carregarRanking } from './consultas';

usarBancoLimpo();

const PERIODO = { inicio: '2020-01-01', fim: '2020-01-31' };

function sessao(id: string, perfil: Perfil, verRelatorios: boolean): UsuarioSessao {
  const permissoes = resolverPermissoes(perfil, verRelatorios ? [] : [{ chave: 'verRelatorios', concedida: false }]);
  if (perfil !== 'Administrador') permissoes.verRelatorios = verRelatorios;
  return {
    id,
    nome: 'Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes,
    ehAprovadorDelegado: false,
  };
}

let seq = 0;
function idDemanda() {
  seq += 1;
  return `LF${String(seq).padStart(10, '0')}`;
}

describe('produtividade por editor', () => {
  it('calcula concluídas, em andamento, atrasadas e a média exata dos ciclos concluídos', async () => {
    const alfa = await criarUsuario({ perfil: 'Editor', nome: 'Editor Alfa' });
    const beta = await criarUsuario({ perfil: 'Editor', nome: 'Editor Beta' });
    const sql = sqlTeste();

    const concluidaA = idDemanda();
    const concluidaB = idDemanda();
    const andamento = idDemanda();
    const atrasada = idDemanda();
    const fora = idDemanda();
    const aprovacao = idDemanda();

    await sql`
      INSERT INTO demands (id, title, format, status, priority, editor_id, completed_at, post_date)
      VALUES
        (${concluidaA}, 'Peça concluída A', 'Vídeo', 'Concluída', 'Normal', ${alfa.id},
         '2020-01-10 15:00:00-03', NULL),
        (${concluidaB}, 'Peça concluída B', 'Vídeo', 'Concluída', 'Normal', ${alfa.id},
         '2020-01-20 15:00:00-03', NULL),
        (${fora}, 'Peça de fevereiro', 'Vídeo', 'Concluída', 'Normal', ${alfa.id},
         '2020-02-02 15:00:00-03', NULL),
        (${andamento}, 'Peça em execução', 'Vídeo', 'Em execução', 'Normal', ${beta.id},
         NULL, NULL),
        (${atrasada}, 'Peça atrasada', 'Vídeo', 'Em execução', 'Normal', ${beta.id},
         NULL, '2020-01-08'),
        (${aprovacao}, 'Peça em aprovação', 'Vídeo', 'Aprovação', 'Normal', ${beta.id},
         NULL, '2020-01-08')
    `;

    await sql`
      INSERT INTO editing_cycles (id, demand_id, version, editor_id, started_at, ended_at, active_ms, status)
      VALUES
        ('CY0000000001', ${concluidaA}, 1, ${alfa.id}, '2020-01-10 12:00:00-03', '2020-01-10 15:00:00-03', 120000, 'Concluído'),
        ('CY0000000002', ${concluidaB}, 1, ${alfa.id}, '2020-01-20 12:00:00-03', '2020-01-20 15:00:00-03', 60000, 'Concluído'),
        ('CY0000000003', ${fora}, 1, ${alfa.id}, '2020-02-02 12:00:00-03', '2020-02-02 15:00:00-03', 999999, 'Concluído'),
        ('CY0000000004', ${concluidaA}, 2, ${alfa.id}, '2020-01-11 12:00:00-03', '2020-01-11 15:00:00-03', 10, 'Interrompido'),
        ('CY0000000005', ${andamento}, 1, ${beta.id}, '2020-01-05 12:00:00-03', NULL, NULL, 'Em andamento')
    `;

    const linhas = await produtividadePorEditor(PERIODO);
    const linhaAlfa = linhas.find((l) => l.editorId === alfa.id);
    const linhaBeta = linhas.find((l) => l.editorId === beta.id);

    expect(linhaAlfa).toMatchObject({ concluidas: 2, emAndamento: 0, atrasadas: 0, tempoMedioMs: 90000 });
    expect(linhaBeta).toMatchObject({ concluidas: 0, emAndamento: 1, atrasadas: 1, tempoMedioMs: null });
    expect(linhas.map((l) => l.nome)).toEqual(['Editor Alfa', 'Editor Beta']);

    expect(await tempoMedioEdicao(PERIODO, alfa.id)).toBe(90000);
    expect(await tempoMedioEdicao(PERIODO, beta.id)).toBeNull();

    const atrasadas = await listarDemandasAtrasadas(beta.id);
    expect(atrasadas.map((d) => d.id)).toEqual([atrasada]);
  });

  it('enxerga o ciclo aberto pela máquina de Status', async () => {
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor Ciclo' });
    const sql = sqlTeste();
    const demandaId = idDemanda();
    await sql`
      INSERT INTO demands (id, title, format, status, priority, editor_id)
      VALUES (${demandaId}, 'Demanda da máquina', 'Vídeo', 'Não iniciada', 'Normal', ${editor.id})
    `;
    await sql.begin(async (tx) => {
      await transicionarStatus(tx, {
        demandaId,
        novoStatus: 'Em execução',
        usuarioId: editor.id,
      });
    });

    const hoje = hojeSaoPaulo();
    const linhas = await produtividadePorEditor({ inicio: hoje, fim: hoje });
    expect(linhas.find((l) => l.editorId === editor.id)?.emAndamento).toBe(1);
  });

  it('rejeita período inválido e quem não tem verRelatorios', async () => {
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor Sem Relatorio' });
    await expect(produtividadePorEditor({ inicio: '2020-02-01', fim: '2020-01-01' })).rejects.toThrow(
      'Período inválido.',
    );
    await expect(carregarRanking(sessao(editor.id, 'Editor', false), PERIODO)).rejects.toThrow(
      'permissão',
    );

    const admin = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Relatorio' });
    await expect(carregarRanking(sessao(admin.id, 'Administrador', true), PERIODO)).resolves.toEqual([]);
  });

  it('resume o dia civil sem misturar o dia seguinte', async () => {
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor Dia' });
    const sql = sqlTeste();
    const noDia = idDemanda();
    const depois = idDemanda();
    await sql`
      INSERT INTO demands (id, title, format, status, priority, editor_id, created_at, completed_at, post_date)
      VALUES
        (${noDia}, 'Entrou no dia', 'Vídeo', 'Concluída', 'Normal', ${editor.id},
         '2020-03-04 10:00:00-03', '2020-03-04 18:00:00-03', '2020-03-01'),
        (${depois}, 'Entrou depois', 'Vídeo', 'Em execução', 'Normal', ${editor.id},
         '2020-03-05 10:00:00-03', NULL, '2020-03-01')
    `;
    await sql`
      INSERT INTO history (demand_id, action, user_id, created_at)
      VALUES (${noDia}, 'status:Concluída', ${editor.id}, '2020-03-04 18:00:00-03')
    `;

    const resumo = await resumoDoDia('2020-03-04');
    expect(resumo).toEqual({
      dia: '2020-03-04',
      entraram: 1,
      mudaramStatus: 1,
      concluidas: 1,
      atrasadas: 1,
    });
  });
});
