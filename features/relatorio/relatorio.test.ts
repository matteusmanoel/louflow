import { describe, expect, it } from 'vitest';
import { ErroDominio } from '@/lib/errors';
import { resolverPermissoes, type ConcessaoIndividual, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { obterRelatorioDiario, type RelatorioDiario } from './consultas';
import { resolverDiaRelatorio } from './dia';

usarBancoLimpo();

const DIA = '2026-03-15';

function sessao(id: string, perfil: Perfil, concessoes: ConcessaoIndividual[] = []): UsuarioSessao {
  return {
    id,
    nome: 'Usuário Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: resolverPermissoes(perfil, concessoes),
    ehAprovadorDelegado: false,
  };
}

async function semearDia() {
  const sql = sqlTeste();
  await sql`
    INSERT INTO demands (
      id, title, format, status, created_at, completed_at, deleted_at, post_date, approval_date
    ) VALUES
      ('LFentrou', 'Entrou ativa', 'Reels', 'Não iniciada',
        '2026-03-15 12:00:00-03'::timestamptz, NULL, NULL, NULL, NULL),
      ('LFfim', 'Entrou no fim do dia', 'Reels', 'Não iniciada',
        '2026-03-16 02:30:00+00'::timestamptz, NULL, NULL, NULL, NULL),
      ('LFlixo', 'Entrou na lixeira', 'Reels', 'Não iniciada',
        '2026-03-15 08:00:00-03'::timestamptz, NULL, '2026-03-15 19:00:00-03'::timestamptz, NULL, NULL),
      ('LFontem', 'Entrou no dia anterior', 'Reels', 'Não iniciada',
        '2026-03-15 02:30:00+00'::timestamptz, NULL, NULL, NULL, NULL),
      ('LFmudou', 'Mudou de status', 'Reels', 'Em execução',
        '2026-03-01 09:00:00-03'::timestamptz, NULL, NULL, NULL, NULL),
      ('LFconcluiu', 'Concluiu no dia', 'Reels', 'Concluída',
        '2026-03-01 09:00:00-03'::timestamptz, '2026-03-15 18:00:00-03'::timestamptz, NULL, NULL, NULL),
      ('LFconcluiuFim', 'Concluiu no fim do dia', 'Reels', 'Concluída',
        '2026-03-01 09:00:00-03'::timestamptz, '2026-03-16 02:30:00+00'::timestamptz, NULL, NULL, NULL),
      ('LFconcluiuAntes', 'Concluiu ontem', 'Reels', 'Concluída',
        '2026-03-01 09:00:00-03'::timestamptz, '2026-03-15 02:30:00+00'::timestamptz, NULL, NULL, NULL),
      ('LFatraso', 'Atrasada pela postagem', 'Reels', 'Em execução',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, '2026-03-10', NULL),
      ('LFajustes', 'Ajustes atrasados', 'Reels', 'Ajustes solicitados',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, '2026-03-12', NULL),
      ('LFatrasoAprov', 'Atrasada pela aprovação', 'Reels', 'Não iniciada',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, NULL, '2026-03-14'),
      ('LFaprovacao', 'Em aprovação', 'Reels', 'Aprovação',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, '2026-03-01', NULL),
      ('LFprazoHoje', 'Prazo no dia', 'Reels', 'Em execução',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, '2026-03-15', NULL),
      ('LFfutura', 'Postagem futura', 'Reels', 'Pausada',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, '2026-03-20', '2026-03-01'),
      ('LFatrasoLixo', 'Atrasada na lixeira', 'Reels', 'Em execução',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, '2026-03-10 10:00:00-03'::timestamptz, '2026-03-01', NULL),
      ('LFcancelada', 'Cancelada com prazo', 'Reels', 'Cancelada',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, '2026-03-01', NULL),
      ('LFreprovada', 'Reprovada com prazo', 'Reels', 'Reprovada',
        '2026-02-01 10:00:00-03'::timestamptz, NULL, NULL, '2026-03-01', NULL)
  `;
  await sql`
    INSERT INTO history (demand_id, action, created_at) VALUES
      ('LFmudou', 'status:Em execução', '2026-03-15 15:30:00-03'::timestamptz),
      ('LFmudou', 'status:Pausada', '2026-03-15 16:00:00-03'::timestamptz),
      ('LFmudou', 'status:Ajustes solicitados', '2026-03-16 02:00:00+00'::timestamptz),
      ('LFmudou', 'Demanda criada', '2026-03-15 09:00:00-03'::timestamptz),
      ('LFmudou', 'status:Cancelada', '2026-03-15 02:00:00+00'::timestamptz),
      ('LFmudou', 'status:Pausada', '2026-03-14 15:30:00-03'::timestamptz)
  `;
}

function expectQuatroGrupos(relatorio: RelatorioDiario) {
  expect(relatorio.dia).toBe(DIA);
  expect(relatorio.entraram.map((item) => [item.titulo, item.lixeira])).toEqual([
    ['Entrou ativa', false],
    ['Entrou no fim do dia', false],
    ['Entrou na lixeira', true],
  ]);
  expect(relatorio.mudaramStatus.map((item) => [item.titulo, item.status])).toEqual([
    ['Mudou de status', 'Em execução'],
    ['Mudou de status', 'Pausada'],
    ['Mudou de status', 'Ajustes solicitados'],
  ]);
  expect(relatorio.concluiram.map((item) => item.titulo)).toEqual([
    'Concluiu no dia',
    'Concluiu no fim do dia',
  ]);
  expect(relatorio.atrasadas.map((item) => [item.titulo, item.prazo, item.status])).toEqual([
    ['Atrasada pela postagem', '2026-03-10', 'Em execução'],
    ['Ajustes atrasados', '2026-03-12', 'Ajustes solicitados'],
    ['Atrasada pela aprovação', '2026-03-14', 'Não iniciada'],
  ]);
}

describe('resolverDiaRelatorio', () => {
  it('usa o calendário de America/Sao_Paulo e recusa dia inválido', () => {
    const tarde = new Date('2026-03-15T15:00:00-03:00');
    expect(resolverDiaRelatorio(undefined, tarde)).toBe(DIA);
    expect(resolverDiaRelatorio('2026-02-31', tarde)).toBe(DIA);
    expect(resolverDiaRelatorio(DIA, tarde)).toBe(DIA);
    expect(resolverDiaRelatorio(undefined, new Date('2026-03-16T02:30:00Z'))).toBe(DIA);
    expect(resolverDiaRelatorio(undefined, new Date('2026-03-15T02:30:00Z'))).toBe('2026-03-14');
  });
});

describe('obterRelatorioDiario', () => {
  it('separa os quatro grupos do dia para o Administrador', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    await semearDia();

    const relatorio = await obterRelatorioDiario(sessao(admin.id, 'Administrador'), DIA);
    expectQuatroGrupos(relatorio);
  });

  it('recusa editor sem verRelatorios', async () => {
    const editor = await criarUsuario({ perfil: 'Editor' });
    await semearDia();

    await expect(obterRelatorioDiario(sessao(editor.id, 'Editor'), DIA)).rejects.toBeInstanceOf(ErroDominio);
    await expect(obterRelatorioDiario(sessao(editor.id, 'Editor'), DIA)).rejects.toThrow(/permissão/i);
  });

  it('editor com verRelatorios lê o relatório', async () => {
    const editor = await criarUsuario({ perfil: 'Editor' });
    await sqlTeste()`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      VALUES (${editor.id}, 'verRelatorios', true)
    `;
    await semearDia();

    const relatorio = await obterRelatorioDiario(
      sessao(editor.id, 'Editor', [{ chave: 'verRelatorios', concedida: true }]),
      DIA,
    );
    expectQuatroGrupos(relatorio);
  });
});
