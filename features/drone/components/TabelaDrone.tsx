'use client';

import { useTransition } from 'react';
import type { ResultadoListarUsosDrone } from '../consultas';
import { cancelarUsoDrone } from '../actions';
import { Badge } from '@/components/ui/badge';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { AcoesLinha } from '@/components/ui/acoes-linha';
import { TabelaWrapper, Th, Td, classeColunaAcoes } from '@/components/ui/tabela';
import { formatarData } from '@/lib/datas';
import { mostrarFeedback } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Plane } from 'lucide-react';

type Props = ResultadoListarUsosDrone;

function LinhaAcoes({ id, status, rotulo }: { id: string; status: 'Ativo' | 'Cancelado'; rotulo: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  if (status === 'Cancelado') {
    return <span className="text-xs text-[var(--texto-suave)]">—</span>;
  }

  function handleCancelar() {
    if (pendente) return;
    iniciarTransicao(async () => {
      const resultado = await cancelarUsoDrone({ id });
      mostrarFeedback(resultado);
    });
  }

  return (
    <AcoesLinha
      rotulo={rotulo}
      itens={[
        { rotulo: 'Editar', href: `/drone/${id}/editar` },
        {
          rotulo: 'Cancelar',
          destrutivo: true,
          confirmacao: {
            titulo: 'Cancelar registro?',
            descricao: 'Este registro de uso de drone será cancelado. A operação não pode ser desfeita.',
            confirmar: 'Confirmar cancelamento',
          },
          onSelect: handleCancelar,
        },
      ]}
    />
  );
}

export function TabelaDrone({ usos, totalAtivosReais }: Props) {
  if (usos.length === 0) {
    return (
      <EstadoVazio
        icone={Plane}
        titulo="Nenhum uso de drone registrado"
        descricao="Registre um uso para que ele apareça aqui."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex justify-end">
        <Badge variant="prioridade-normal" className="px-3 py-1.5 text-xs">
          Total (registros ativos):{' '}
          <span className="fonte-numero">
            {totalAtivosReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </Badge>
      </div>

      <TabelaWrapper>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Responsável</Th>
              <Th>Perfil atendido</Th>
              <Th>Motivo</Th>
              <Th>Local</Th>
              <Th>Valor</Th>
              <Th>Status</Th>
              <Th className={classeColunaAcoes}>
                <span className="sr-only">Ações</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {usos.map((uso) => (
              <tr
                key={uso.id}
                className={cn(
                  'group hover:bg-[var(--tabela-linha-hover)]',
                  uso.status === 'Cancelado' && 'opacity-[0.55]',
                )}
              >
                <Td className="whitespace-nowrap tabular-nums">{formatarData(uso.used_on)}</Td>
                <Td>{uso.responsible}</Td>
                <Td>{uso.served_profile}</Td>
                <Td>{uso.reason}</Td>
                <Td>{uso.location}</Td>
                <Td className="whitespace-nowrap fonte-numero">R$ 250,00</Td>
                <Td>
                  <Badge variant={uso.status === 'Ativo' ? 'prioridade-normal' : 'leitura'}>
                    {uso.status}
                  </Badge>
                </Td>
                <Td className={cn(classeColunaAcoes, 'group-hover:bg-[var(--tabela-linha-hover)]')}>
                  <LinhaAcoes id={uso.id} status={uso.status} rotulo={uso.responsible} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaWrapper>
    </div>
  );
}
