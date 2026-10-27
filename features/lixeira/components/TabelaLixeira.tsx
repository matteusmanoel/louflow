'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { DemandaLixeira } from '../consultas';
import { restaurarDemanda, excluirDefinitivamente } from '../actions';
import { AcoesLinha } from '@/components/ui/acoes-linha';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Td, Th, classeColunaAcoes } from '@/components/ui/tabela';
import { formatarDataHora } from '@/lib/datas';
import { mostrarFeedback } from '@/lib/toast';

type Props = {
  demandas: DemandaLixeira[];
  podeGerenciar: boolean;
};

const VARIANTE_STATUS: Record<string, BadgeVariant> = {
  'Não iniciada': 'leitura',
  'Em execução': 'prioridade-normal',
  Pausada: 'prioridade-alta',
  Aprovação: 'aprovacao',
  'Ajustes solicitados': 'prioridade-urgente',
  Concluída: 'secondary',
  Reprovada: 'prioridade-urgente',
  Cancelada: 'leitura',
};

export function TabelaLixeira({ demandas, podeGerenciar }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (demandas.length === 0) {
    return (
      <EstadoVazio
        icone={Trash2}
        titulo="Lixeira vazia"
        descricao="Nenhuma demanda foi movida para a Lixeira."
      />
    );
  }

  function handleRestaurar(demandaId: string) {
    startTransition(async () => {
      const res = await restaurarDemanda({ demandaId });
      mostrarFeedback(res);
      if (res.ok) router.refresh();
    });
  }

  function handleExcluir(demandaId: string) {
    startTransition(async () => {
      const res = await excluirDefinitivamente({ demandaId });
      mostrarFeedback(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <TabelaWrapper>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Título</Th>
            <Th>Formato</Th>
            <Th>Status</Th>
            <Th>Excluída em</Th>
            <Th>Por</Th>
            {podeGerenciar && (
              <Th className={`${classeColunaAcoes} z-10 bg-[var(--tabela-cabecalho-fundo)]`}>
                <span className="sr-only">Ações</span>
              </Th>
            )}
          </tr>
        </thead>
        <tbody>
          {demandas.map((d) => (
            <tr key={d.id} className="group transition-colors hover:bg-[var(--tabela-linha-hover)]">
              <Td>{d.id}</Td>
              <Td>{d.title}</Td>
              <Td>{d.format}</Td>
              <Td>
                <Badge variant={VARIANTE_STATUS[d.status] ?? 'leitura'} className="pointer-events-none">
                  {d.status}
                </Badge>
              </Td>
              <Td className="whitespace-nowrap tabular-nums">{formatarDataHora(d.deleted_at)}</Td>
              <Td>{d.deletado_por_nome ?? '—'}</Td>
              {podeGerenciar && (
                <Td className={`${classeColunaAcoes} z-10 group-hover:bg-[var(--tabela-linha-hover)]`}>
                  {pending ? (
                    <span className="inline-flex justify-end">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--texto-suave)]" aria-hidden />
                      <span className="sr-only">Processando</span>
                    </span>
                  ) : (
                    <AcoesLinha
                      rotulo={d.title}
                      itens={[
                        { rotulo: 'Restaurar', onSelect: () => handleRestaurar(d.id) },
                        {
                          rotulo: 'Excluir',
                          destrutivo: true,
                          confirmacao: {
                            titulo: 'Excluir definitivamente?',
                            descricao: `A demanda "${d.title}" será excluída permanentemente. Esta ação não pode ser desfeita.`,
                            confirmar: 'Excluir',
                          },
                          onSelect: () => handleExcluir(d.id),
                        },
                      ]}
                    />
                  )}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaWrapper>
  );
}
