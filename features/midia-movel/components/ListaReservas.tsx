'use client';

import { useState, useTransition } from 'react';
import { Video } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { AcoesLinha } from '@/components/ui/acoes-linha';
import { TabelaWrapper, Th, Td, classeColunaAcoes } from '@/components/ui/tabela';
import { formatarDataHora } from '@/lib/datas';
import { cn } from '@/lib/utils';
import { cancelarReserva } from '../actions';
import type { ReservaMidiaMovel } from '../consultas';

type Estado = { mensagem: string; ok: boolean } | null;

type VarianteStatus = 'prioridade-urgente' | 'aprovacao' | 'leitura' | 'secondary';

function varianteStatus(status: ReservaMidiaMovel['status'], emUso: boolean): VarianteStatus {
  if (emUso) return 'prioridade-urgente';
  if (status === 'Reservada') return 'aprovacao';
  if (status === 'Finalizada') return 'secondary';
  return 'leitura';
}

function labelStatus(status: ReservaMidiaMovel['status'], emUso: boolean): string {
  if (emUso) return 'Em uso';
  return status;
}

function LinhaReserva({
  reserva,
  usuarioId,
  ehAdmin,
}: {
  reserva: ReservaMidiaMovel;
  usuarioId: string;
  ehAdmin: boolean;
}) {
  const [estado, setEstado] = useState<Estado>(null);
  const [pendente, iniciar] = useTransition();

  const podeCancelar = reserva.status === 'Reservada' && (reserva.reservedBy === usuarioId || ehAdmin);

  return (
    <tr className="group hover:bg-[var(--tabela-linha-hover)]">
      <Td>
        <span className="font-medium">{reserva.reason}</span>
        {estado && (
          <Alert variant={estado.ok ? 'info' : 'destructive'} className="mt-2">
            <AlertDescription>{estado.mensagem}</AlertDescription>
          </Alert>
        )}
      </Td>
      <Td className="whitespace-nowrap tabular-nums text-[var(--texto-suave)]">
        {formatarDataHora(reserva.startsAt)} → {formatarDataHora(reserva.endsAt)}
      </Td>
      <Td>{reserva.reservedByName}</Td>
      <Td>
        <Badge variant={varianteStatus(reserva.status, reserva.emUso)}>
          {labelStatus(reserva.status, reserva.emUso)}
        </Badge>
      </Td>
      <Td className={cn(classeColunaAcoes, 'group-hover:bg-[var(--tabela-linha-hover)]')}>
        <AcoesLinha
          rotulo={reserva.reason}
          itens={
            podeCancelar
              ? [
                  {
                    rotulo: 'Cancelar reserva',
                    destrutivo: true,
                    confirmacao: {
                      titulo: 'Cancelar reserva?',
                      descricao: 'A reserva de Mídia Móvel será cancelada e o horário ficará livre.',
                      confirmar: 'Cancelar reserva',
                    },
                    onSelect: () => {
                      if (pendente) return;
                      iniciar(async () => {
                        const resultado = await cancelarReserva({ id: reserva.id });
                        setEstado({ mensagem: resultado.mensagem, ok: resultado.ok });
                      });
                    },
                  },
                ]
              : []
          }
        />
      </Td>
    </tr>
  );
}

export function ListaReservas({
  reservas,
  usuarioId,
  ehAdmin,
}: {
  reservas: ReservaMidiaMovel[];
  usuarioId: string;
  ehAdmin: boolean;
}) {
  if (reservas.length === 0) {
    return (
      <EstadoVazio
        icone={Video}
        titulo="Nenhuma reserva"
        descricao="Não há reservas de Mídia Móvel no momento."
      />
    );
  }

  return (
    <TabelaWrapper>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th>Motivo</Th>
            <Th>Período</Th>
            <Th>Responsável</Th>
            <Th>Status</Th>
            <Th className={classeColunaAcoes}>
              <span className="sr-only">Ações</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((r) => (
            <LinhaReserva key={r.id} reserva={r} usuarioId={usuarioId} ehAdmin={ehAdmin} />
          ))}
        </tbody>
      </table>
    </TabelaWrapper>
  );
}
