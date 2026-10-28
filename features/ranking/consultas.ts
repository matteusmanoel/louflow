import 'server-only';
import { ErroDominio } from '@/lib/errors';
import type { UsuarioSessao } from '@/lib/session';
import { produtividadePorEditor, type Periodo, type ProdutividadeEditor } from '@/features/metricas/consultas';

export type { Periodo, ProdutividadeEditor };

export async function carregarRanking(
  usuario: UsuarioSessao,
  periodo: Periodo,
): Promise<ProdutividadeEditor[]> {
  if (!usuario.permissoes.verRelatorios) {
    throw new ErroDominio('Você não tem permissão para ver o ranking.');
  }
  return produtividadePorEditor(periodo);
}
