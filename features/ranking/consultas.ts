import 'server-only';
import { db } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import type { UsuarioSessao } from '@/lib/session';
import { produtividadePorEditor, type Periodo, type ProdutividadeEditor } from '@/features/metricas/consultas';
import { rankingComNota } from '@/features/metricas/nota-ranking';

export type { Periodo, ProdutividadeEditor };

export type LinhaRanking = ProdutividadeEditor & {
  /** Mesma nota do Painel de TV (volume 40 + aprovação direta 20 + agilidade 10), 0–100; null sem entrega no período. */
  nota: number | null;
  /** 1.ª, 2.ª… entre quem disputa e tem 2+ entregas; null para staff e amostra curta. */
  posicao: number | null;
  /** Designação de nota informativa: aparece, mas não disputa posição. */
  staff: boolean;
};

export async function carregarRanking(usuario: UsuarioSessao, periodo: Periodo): Promise<LinhaRanking[]> {
  if (!usuario.permissoes.verRelatorios) {
    throw new ErroDominio('Você não tem permissão para ver o ranking.');
  }
  const [produtividade, notas] = await Promise.all([
    produtividadePorEditor(periodo),
    rankingComNota(db(), periodo, { limiteDisputantes: Number.POSITIVE_INFINITY }),
  ]);
  const porEditor = new Map(notas.flatMap((item) => (item.editorId ? [[item.editorId, item] as const] : [])));

  const linhas = produtividade.map((linha): LinhaRanking => {
    const item = porEditor.get(linha.editorId);
    return {
      ...linha,
      nota: item?.nota ?? null,
      posicao: item?.posicao ?? null,
      staff: item?.staff ?? false,
    };
  });

  // Posicionados primeiro, na ordem da posição; os demais mantêm a ordem por concluídas.
  return linhas
    .map((linha, indice) => ({ linha, indice }))
    .sort((a, b) =>
      (a.linha.posicao ?? Number.POSITIVE_INFINITY) - (b.linha.posicao ?? Number.POSITIVE_INFINITY)
      || a.indice - b.indice)
    .map(({ linha }) => linha);
}
