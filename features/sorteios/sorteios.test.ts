import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defCadastrarSorteio, defRegistrarRetirada } from './acoes-def';
import { listarSorteios } from './consultas';

usarBancoLimpo();

function sessao(id: string, perfil: Perfil, verSorteios = true): UsuarioSessao {
  const permissoes = resolverPermissoes(perfil, []);
  if (perfil !== 'Administrador' && perfil !== 'Premios') permissoes.verSorteios = verSorteios;
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

const entrada = {
  ganhador: 'Ganhador Teste',
  mes: '2026-10',
  campanha: 'Campanha sintética',
  premio: 'Kit de teste',
  prazoRetirada: '2026-11-15',
  observacoes: 'Observação sintética.',
  retirou: false,
};

describe('sorteios', () => {
  it('cadastra, filtra por ano e registra a retirada uma única vez', async () => {
    const premios = await criarUsuario({ perfil: 'Premios', nome: 'Perfil Prêmios' });
    const usuario = sessao(premios.id, 'Premios');
    const sql = sqlTeste();

    const criado = await executarAcao(defCadastrarSorteio, entrada, {
      obterUsuario: async () => usuario,
      sql: sqlTeste,
    });
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    await executarAcao(
      defCadastrarSorteio,
      { ...entrada, ganhador: 'Outro Ganhador', mes: '2025-01', premio: 'Outro prêmio', prazoRetirada: '' },
      { obterUsuario: async () => usuario, sql: sqlTeste },
    );

    const de2026 = await listarSorteios(usuario, '', '2026');
    expect(de2026.total).toBe(1);
    expect(de2026.registros[0]?.premio).toBe('Kit de teste');
    expect(de2026.anos).toEqual(['2026', '2025']);

    const busca = await listarSorteios(usuario, 'outro prêmio', '');
    expect(busca.registros.map((item) => item.ganhador)).toEqual(['Outro Ganhador']);

    const retirada = await executarAcao(
      defRegistrarRetirada,
      { id: criado.dados.id },
      { obterUsuario: async () => usuario, sql: sqlTeste },
    );
    expect(retirada.ok).toBe(true);

    const deNovo = await executarAcao(
      defRegistrarRetirada,
      { id: criado.dados.id },
      { obterUsuario: async () => usuario, sql: sqlTeste },
    );
    expect(deNovo.ok).toBe(false);
    expect(deNovo.mensagem).toBe('A retirada já está registrada.');

    const [linha] = await sql<{ retrieved: boolean; retrieved_at: Date | null }[]>`
      SELECT retrieved, retrieved_at FROM raffles WHERE id = ${criado.dados.id}
    `;
    expect(linha?.retrieved).toBe(true);
    expect(linha?.retrieved_at).toBeTruthy();
  });

  it('recusa mês inválido, busca longa e quem não tem verSorteios', async () => {
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor Sem Sorteio' });
    const semPermissao = sessao(editor.id, 'Editor', false);
    sqlTeste();

    const mes = await executarAcao(
      defCadastrarSorteio,
      { ...entrada, mes: '2026-13' },
      { obterUsuario: async () => semPermissao, sql: sqlTeste },
    );
    expect(mes.ok).toBe(false);

    const negado = await executarAcao(defCadastrarSorteio, entrada, {
      obterUsuario: async () => semPermissao,
      sql: sqlTeste,
    });
    expect(negado.ok).toBe(false);
    expect(negado.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
    await expect(listarSorteios(semPermissao, '', '')).rejects.toThrow('permissão');
    await expect(listarSorteios(sessao(editor.id, 'Editor', true), 'a'.repeat(101), '')).rejects.toThrow(
      '100 caracteres',
    );
  });
});
