import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { listarHistoricoDb } from '../consultas';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { formatarDataHora } from '@/lib/datas';
import { History } from 'lucide-react';

const ROTULOS_ACAO: Record<string, string> = {
  status: 'Mudança de status',
  adiamento: 'Adiamento',
  ajuste: 'Ajuste solicitado',
  lixeira: 'Movida para a Lixeira',
  recebimento_confirmado: 'Recebimento confirmado',
  ficha_tecnica_salva: 'Ficha técnica salva',
  comentou: 'Comentou',
  postagem_agendada: 'Postagem agendada',
  agendamento_cancelado: 'Agendamento cancelado',
};

function rotuloAcao(acao: string): string {
  if (acao.startsWith('status:')) {
    return `Status alterado para ${acao.slice('status:'.length)}`;
  }
  const conhecido = ROTULOS_ACAO[acao];
  if (conhecido) return conhecido;
  if (!acao.includes('_')) return acao;
  const texto = acao.replaceAll('_', ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Datas soltas no texto livre (AAAA-MM-DD) viram dd/MM/yyyy na leitura. */
function exibirDetalhes(texto: string): string {
  return texto.replace(/\d{4}-\d{2}-\d{2}(?!T)/g, (iso) => {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  });
}

/**
 * Seção reservada do detalhe da Demanda: Linha do tempo do Histórico (somente leitura).
 * Dona: S1-12 (#11567). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function HistoricoSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  void usuario;
  const entradas = await listarHistoricoDb(demandaId);

  return (
    <section
      aria-label="Histórico"
      className="flex flex-col gap-3 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-5 shadow-[var(--sombra-card)]"
    >
      <h3 className="text-base font-semibold text-[var(--texto-forte)] m-0">Histórico</h3>

      {entradas.length === 0 ? (
        <EstadoVazio
          icone={History}
          titulo="Nenhuma atividade"
          descricao="Nenhuma atividade foi registrada para esta demanda."
        />
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-0 relative">
          {entradas.map((e) => (
            <li key={e.id} className="flex gap-3 pb-4 relative">
              {/* Linha vertical da timeline */}
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[var(--loumar-700)]" aria-hidden="true" />
                <span className="flex-1 w-px bg-[var(--borda-app)]" />
              </div>
              <div className="flex flex-col gap-0.5 pb-1 min-w-0">
                <span className="text-sm font-medium text-[var(--texto-forte)]">{rotuloAcao(e.acao)}</span>
                <span className="text-xs text-[var(--texto-suave)]">
                  {e.usuarioNome ?? 'Sistema'}
                  {' · '}
                  <time className="tabular-nums" dateTime={e.criadoEm.toISOString()}>
                    {formatarDataHora(e.criadoEm)}
                  </time>
                </span>
                {e.detalhes && (
                  <p className="m-0 mt-0.5 whitespace-pre-wrap text-xs text-[var(--texto-suave)]">
                    {exibirDetalhes(e.detalhes)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
