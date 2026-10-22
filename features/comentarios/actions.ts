'use server';

import { criarAcao, type DefinicaoAcao } from '@/lib/action';
import { novoId } from '@/lib/crypto';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import { schemaAdicionarComentario, schemaExcluirComentario } from './schema';

// --- Definições exportadas para testes ---

export const defAdicionarComentario: DefinicaoAcao<
  typeof schemaAdicionarComentario,
  { id: string }
> = {
  nome: 'adicionarComentario',
  schema: schemaAdicionarComentario,
  // Qualquer usuário autenticado pode comentar
  executar: async ({ tx, usuario, entrada }) => {
    const id = novoId();
    await tx`
      INSERT INTO comments (id, demand_id, author_id, body)
      VALUES (${id}, ${entrada.demandaId}, ${usuario.id}, ${entrada.conteudo})
    `;
    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'comentou',
      usuarioId: usuario.id,
    });
    return { dados: { id }, mensagem: 'Comentário adicionado.' };
  },
};

export const defExcluirComentario: DefinicaoAcao<
  typeof schemaExcluirComentario,
  { id: string }
> = {
  nome: 'excluirComentario',
  schema: schemaExcluirComentario,
  executar: async ({ tx, usuario, entrada }) => {
    const [existente] = await tx<{ author_id: string; demand_id: string }[]>`
      SELECT author_id, demand_id FROM comments WHERE id = ${entrada.comentarioId}
    `;
    if (!existente) throw new ErroDominio('Comentário não encontrado.');
    const ehDono = existente.author_id === usuario.id;
    const temPermissao = usuario.permissoes.gerenciarUsuarios;
    if (!ehDono && !temPermissao) {
      throw new ErroDominio('Você não pode excluir este comentário.');
    }
    await tx`DELETE FROM comments WHERE id = ${entrada.comentarioId}`;
    await registrarHistorico(tx, {
      demandaId: existente.demand_id,
      acao: 'excluiu comentário',
      usuarioId: usuario.id,
    });
    return { dados: { id: entrada.comentarioId }, mensagem: 'Comentário excluído.' };
  },
};

// --- Server Actions públicas ---

export const adicionarComentario = criarAcao(defAdicionarComentario);
export const excluirComentario = criarAcao(defExcluirComentario);
