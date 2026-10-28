import { beforeEach, describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { TEXTO_SUPORTADO } from './responder';
import { defPerguntarAnalista } from './acoes-def';
import { consumirIntervalo, reiniciarIntervaloAnalista } from './intervalo';

usarBancoLimpo();

beforeEach(() => {
  reiniciarIntervaloAnalista();
});

function sessao(id: string, perfil: Perfil): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: resolverPermissoes(perfil, []),
    ehAprovadorDelegado: false,
  };
}

async function perguntar(id: string, perfil: Perfil, pergunta: string) {
  return executarAcao(defPerguntarAnalista, { pergunta }, {
    obterUsuario: async () => sessao(id, perfil),
    sql: sqlTeste,
  });
}

describe('limites do analista', () => {
  it('rejeita pergunta acima de 1200 caracteres', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Analista' });
    const resultado = await perguntar(admin.id, 'Administrador', 'a'.repeat(1201));
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/1200/);
  });

  it('impõe 4 segundos entre perguntas do mesmo usuário', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Intervalo' });
    consumirIntervalo(admin.id, 1_000);
    expect(() => consumirIntervalo(admin.id, 2_000)).toThrow(/4 segundos/);
    expect(() => consumirIntervalo(admin.id, 5_000)).not.toThrow();

    reiniciarIntervaloAnalista();
    const primeira = await perguntar(admin.id, 'Administrador', 'qual a cor do céu?');
    const segunda = await perguntar(admin.id, 'Administrador', 'qual a cor do céu?');
    expect(primeira.ok).toBe(true);
    expect(primeira.mensagem).toBe(TEXTO_SUPORTADO);
    expect(primeira.mensagem).not.toMatch(/\d/);
    expect(segunda.ok).toBe(false);
    expect(segunda.mensagem).toMatch(/4 segundos/);
  });

  it('nega a pergunta sem usarAnalista', async () => {
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor Sem Analista' });
    const resultado = await perguntar(editor.id, 'Editor', 'quais demandas estão atrasadas?');
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
  });
});

describe('respostas determinísticas', () => {
  it('responde contagem, tempo médio, atrasadas e resumo com os números do banco', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Consulta' });
    const alfa = await criarUsuario({ perfil: 'Editor', nome: 'Editor Alfa' });
    const sql = sqlTeste();

    await sql`
      INSERT INTO demands (id, title, format, status, priority, editor_id, completed_at, post_date, created_at)
      VALUES
        ('LF0000000001', 'Peça concluída A', 'Vídeo', 'Concluída', 'Normal', ${alfa.id},
         '2020-01-10 15:00:00-03', NULL, '2020-01-10 10:00:00-03'),
        ('LF0000000002', 'Peça concluída B', 'Vídeo', 'Concluída', 'Normal', ${alfa.id},
         '2020-01-20 15:00:00-03', NULL, '2020-01-20 10:00:00-03'),
        ('LF0000000003', 'Peça atrasada', 'Vídeo', 'Em execução', 'Normal', ${alfa.id},
         NULL, '2020-01-08', '2020-01-08 10:00:00-03'),
        ('LF0000000004', 'Peça em aprovação', 'Vídeo', 'Aprovação', 'Normal', ${alfa.id},
         NULL, '2020-01-08', '2020-01-08 11:00:00-03'),
        ('LF0000000005', 'Entrou no dia', 'Vídeo', 'Concluída', 'Normal', ${alfa.id},
         '2020-03-04 18:00:00-03', NULL, '2020-03-04 10:00:00-03')
    `;
    await sql`
      INSERT INTO editing_cycles (id, demand_id, version, editor_id, started_at, ended_at, active_ms, status)
      VALUES
        ('CY0000000001', 'LF0000000001', 1, ${alfa.id}, '2020-01-10 12:00:00-03', '2020-01-10 15:00:00-03', 120000, 'Concluído'),
        ('CY0000000002', 'LF0000000002', 1, ${alfa.id}, '2020-01-20 12:00:00-03', '2020-01-20 15:00:00-03', 60000, 'Concluído')
    `;
    await sql`
      INSERT INTO history (demand_id, action, user_id, created_at)
      VALUES ('LF0000000005', 'status:Concluída', ${alfa.id}, '2020-03-04 18:00:00-03')
    `;

    const contagem = await perguntar(
      admin.id,
      'Administrador',
      'quantas demandas o Editor Alfa concluiu em 2020-01?',
    );
    expect(contagem.mensagem).toContain('Editor Alfa concluiu 2 demandas');

    reiniciarIntervaloAnalista();
    const produtividade = await perguntar(
      admin.id,
      'Administrador',
      'produtividade do Editor Alfa de 01/01/2020 a 31/01/2020',
    );
    expect(produtividade.mensagem).toContain('Editor Alfa concluiu 2 demandas');

    reiniciarIntervaloAnalista();
    const tempo = await perguntar(
      admin.id,
      'Administrador',
      'qual o tempo médio de edição do Editor Alfa em 2020-01?',
    );
    expect(tempo.mensagem).toContain('1 min 30 s');

    reiniciarIntervaloAnalista();
    const atrasadas = await perguntar(admin.id, 'Administrador', 'quais demandas estão atrasadas?');
    expect(atrasadas.mensagem).toContain('Peça atrasada');
    expect(atrasadas.mensagem).not.toContain('Peça em aprovação');

    reiniciarIntervaloAnalista();
    const resumo = await perguntar(admin.id, 'Administrador', 'resumo de 2020-03-04');
    expect(resumo.mensagem).toBe(
      'Em 04/03/2020 entraram 1, mudaram de status 1, concluíram 1 e 1 estavam atrasadas.',
    );

    reiniciarIntervaloAnalista();
    const fantasma = await perguntar(admin.id, 'Administrador', 'quantas demandas o Editor Fantasma concluiu em 2020-01?');
    expect(fantasma.mensagem).toBe('Não encontrei esse editor no LouFlow.');
    expect(fantasma.mensagem).not.toMatch(/\d/);
  });
});
