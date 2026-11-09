'use server';

import { criarAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { urlsDoDono } from '@/features/arquivos/gravar';
import { schemaCriarCorte, schemaConcluirCorte } from './schema';

function gerarId(): string {
  return `CL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Cria um novo Corte.
 * Exige a designação editorPadraoCortes.
 */
export const criarCorte = criarAcao({
  nome: 'cortes:criar',
  schema: schemaCriarCorte,
  permissao: 'editorPadraoCortes',
  executar: async ({ tx, usuario, entrada }) => {
    const id = entrada.id ?? gerarId();
    const arquivos = entrada.arquivos ?? [];
    if (arquivos.length > 0) urlsDoDono(arquivos, 'cortes', id);
    const linkPrincipal = entrada.linkVideo ?? arquivos[0]?.url ?? null;

    await tx`
      INSERT INTO clips (
        id, title, influencer_id, editor_id, post_date,
        editorial_line, video_link, video_links, source_program,
        status, created_by, started_at
      ) VALUES (
        ${id},
        ${entrada.titulo},
        ${entrada.influencerId ?? null},
        ${usuario.id},
        ${entrada.dataPostagem},
        ${entrada.linhaEditorial},
        ${linkPrincipal},
        ${tx.array(arquivos.map((arquivo) => arquivo.url), 1009)},
        ${entrada.programaOrigem},
        'Em andamento',
        ${usuario.id},
        now()
      )
    `;

    return { dados: { id }, mensagem: 'Corte cadastrado com sucesso.' };
  },
});

/**
 * Conclui um Corte em andamento, informando a quantidade produzida.
 * Exige a designação editorPadraoCortes.
 */
export const concluirCorte = criarAcao({
  nome: 'cortes:concluir',
  schema: schemaConcluirCorte,
  permissao: 'editorPadraoCortes',
  executar: async ({ tx, entrada }) => {
    const [corte] = await tx<{ id: string; status: string }[]>`
      SELECT id, status FROM clips WHERE id = ${entrada.id} FOR UPDATE
    `;

    if (!corte) throw new ErroDominio('Corte não encontrado.');
    if (corte.status === 'Concluído') throw new ErroDominio('Este corte já foi concluído.');

    await tx`
      UPDATE clips
      SET status = 'Concluído',
          clips_count = ${entrada.quantidadeProduzida},
          completed_at = now()
      WHERE id = ${entrada.id}
    `;

    return { dados: { id: entrada.id }, mensagem: 'Corte concluído.' };
  },
});
