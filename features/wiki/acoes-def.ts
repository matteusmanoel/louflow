import 'server-only';
import { type DefinicaoAcao } from '@/lib/action';
import { registrarAuditoria } from '@/lib/audit';
import { novoId } from '@/lib/crypto';
import { ErroDominio } from '@/lib/errors';
import {
  schemaAlterarPublicacaoArtigoWiki,
  schemaEditarArtigoWiki,
  schemaSalvarArtigoWiki,
} from './schema';

const somenteAdministrador = (perfil: { perfil: string }) => perfil.perfil === 'Administrador';

function resumoAuditoria(entrada: {
  category: string;
  title: string;
  position: number;
  is_published: boolean;
}) {
  return {
    category: entrada.category,
    title: entrada.title,
    position: entrada.position,
    is_published: entrada.is_published,
  };
}

function resumoOuNulo(summary: string): string | null {
  return summary.length > 0 ? summary : null;
}

export const defCriarArtigoWiki: DefinicaoAcao<typeof schemaSalvarArtigoWiki, { id: string }> = {
  nome: 'criarArtigoWiki',
  schema: schemaSalvarArtigoWiki,
  permissao: somenteAdministrador,
  executar: async ({ tx, usuario, entrada }) => {
    const id = novoId('WK');
    await tx`
      INSERT INTO wiki_articles
        (id, category, title, summary, content, position, is_published, updated_by)
      VALUES
        (${id}, ${entrada.category}, ${entrada.title}, ${resumoOuNulo(entrada.summary)},
         ${entrada.content}, ${entrada.position}, ${entrada.is_published}, ${usuario.id})
    `;
    await registrarAuditoria(tx, {
      acao: 'criar_artigo_wiki',
      usuarioId: usuario.id,
      alvo: id,
      detalhes: entrada.title,
      depois: resumoAuditoria(entrada),
    });
    return { dados: { id }, mensagem: 'Artigo criado.' };
  },
};

export const defEditarArtigoWiki: DefinicaoAcao<typeof schemaEditarArtigoWiki, { id: string }> = {
  nome: 'editarArtigoWiki',
  schema: schemaEditarArtigoWiki,
  permissao: somenteAdministrador,
  executar: async ({ tx, usuario, entrada }) => {
    const [atual] = await tx<{
      category: string;
      title: string;
      position: number;
      is_published: boolean;
    }[]>`
      SELECT category, title, position, is_published
      FROM wiki_articles
      WHERE id = ${entrada.id}
      FOR UPDATE
    `;
    if (!atual) throw new ErroDominio('Artigo não encontrado.');

    await tx`
      UPDATE wiki_articles SET
        category = ${entrada.category},
        title = ${entrada.title},
        summary = ${resumoOuNulo(entrada.summary)},
        content = ${entrada.content},
        position = ${entrada.position},
        is_published = ${entrada.is_published},
        updated_by = ${usuario.id},
        updated_at = now()
      WHERE id = ${entrada.id}
    `;
    await registrarAuditoria(tx, {
      acao: 'editar_artigo_wiki',
      usuarioId: usuario.id,
      alvo: entrada.id,
      detalhes: entrada.title,
      antes: resumoAuditoria(atual),
      depois: resumoAuditoria(entrada),
    });
    return { dados: { id: entrada.id }, mensagem: 'Artigo atualizado.' };
  },
};

export const defAlterarPublicacaoArtigoWiki: DefinicaoAcao<
  typeof schemaAlterarPublicacaoArtigoWiki,
  { id: string }
> = {
  nome: 'alterarPublicacaoArtigoWiki',
  schema: schemaAlterarPublicacaoArtigoWiki,
  permissao: somenteAdministrador,
  executar: async ({ tx, usuario, entrada }) => {
    const [atual] = await tx<{ title: string; is_published: boolean }[]>`
      SELECT title, is_published
      FROM wiki_articles
      WHERE id = ${entrada.id}
      FOR UPDATE
    `;
    if (!atual) throw new ErroDominio('Artigo não encontrado.');

    await tx`
      UPDATE wiki_articles SET
        is_published = ${entrada.is_published},
        updated_by = ${usuario.id},
        updated_at = now()
      WHERE id = ${entrada.id}
    `;
    await registrarAuditoria(tx, {
      acao: entrada.is_published ? 'publicar_artigo_wiki' : 'despublicar_artigo_wiki',
      usuarioId: usuario.id,
      alvo: entrada.id,
      detalhes: atual.title,
      antes: { is_published: atual.is_published },
      depois: { is_published: entrada.is_published },
    });
    return {
      dados: { id: entrada.id },
      mensagem: entrada.is_published ? 'Artigo publicado.' : 'Artigo despublicado.',
    };
  },
};
