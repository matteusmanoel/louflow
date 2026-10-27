import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { listarEntregasDemanda } from '@/features/aprovacoes/consultas';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Upload } from 'lucide-react';

/**
 * Seção reservada do detalhe da Demanda: Entregas e Aprovação da Demanda.
 * Dona: S1-14 (#11569). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function EntregasSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  void usuario;
  const entregas = await listarEntregasDemanda(demandaId);

  const varianteStatus = (status: string): BadgeVariant => {
    if (status === 'Aprovado') return 'secondary';
    if (status === 'Reprovado') return 'prioridade-urgente';
    if (status === 'Pendente') return 'aprovacao';
    return 'leitura';
  };

  return (
    <section
      aria-label="Entregas"
      className="flex flex-col gap-4 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-5 shadow-[var(--sombra-card)]"
    >
      <h2 className="text-base font-semibold text-[var(--texto-forte)] m-0">Entregas</h2>

      {entregas.length === 0 ? (
        <EstadoVazio
          icone={Upload}
          titulo="Nenhuma entrega"
          descricao="Ainda não há entregas registradas para esta demanda."
        />
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-3">
          {entregas.map((e) => (
            <li
              key={e.entregaId}
              className="flex flex-col gap-2 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="fonte-numero text-sm font-medium text-[var(--texto-forte)]">v{e.versao}</span>
                  <Badge variant={varianteStatus(e.status)}>{e.status}</Badge>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={e.link} target="_blank" rel="noopener noreferrer">
                    Ver arquivo
                  </a>
                </Button>
              </div>
              {e.nota && (
                <p className="text-xs text-[var(--texto-suave)] m-0">{e.nota}</p>
              )}
              {e.motivo && (
                <p className="text-xs text-[var(--alerta-atrasada)] m-0">Motivo: {e.motivo}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
