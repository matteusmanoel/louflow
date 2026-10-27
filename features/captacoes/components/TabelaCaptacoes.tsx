'use client';

import { useTransition } from 'react';
import type { Captacao } from '../consultas';
import { cancelarCaptacao } from '../actions';
import { BadgeStatusCaptacao } from './BadgeStatusCaptacao';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Camera } from 'lucide-react';
import { AcoesLinha } from '@/components/ui/acoes-linha';
import { TabelaWrapper, Th, Td, classeColunaAcoes } from '@/components/ui/tabela';
import { formatarDataHora } from '@/lib/datas';
import { mostrarFeedback } from '@/lib/toast';
import { cn } from '@/lib/utils';

function formatarJanela(starts: Date, ends: Date): string {
  return `${formatarDataHora(starts)} – ${formatarDataHora(ends)}`;
}

function AcoesCaptacao({ id, rotulo }: { id: string; rotulo: string }) {
  const [pendente, iniciar] = useTransition();

  return (
    <AcoesLinha
      rotulo={rotulo}
      itens={[
        { rotulo: 'Editar', href: `/captacoes/${id}` },
        {
          rotulo: 'Cancelar captação',
          destrutivo: true,
          confirmacao: {
            titulo: 'Cancelar captação?',
            descricao: 'A captação agendada será cancelada. Essa operação não pode ser desfeita.',
            confirmar: 'Cancelar captação',
          },
          onSelect: () => {
            if (pendente) return;
            iniciar(async () => {
              const resultado = await cancelarCaptacao({ id });
              mostrarFeedback(resultado);
            });
          },
        },
      ]}
    />
  );
}

export function TabelaCaptacoes({
  captacoes,
  podeGerenciar,
}: {
  captacoes: Captacao[];
  podeGerenciar: boolean;
}) {
  if (captacoes.length === 0) {
    return (
      <EstadoVazio
        icone={Camera}
        titulo="Nenhuma captação encontrada"
        descricao="Nenhuma captação está agendada para o período."
      />
    );
  }

  return (
    <TabelaWrapper>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th>Videomaker</Th>
            <Th>Janela</Th>
            <Th>Cliente / Assunto</Th>
            <Th>Local</Th>
            <Th>Status</Th>
            {podeGerenciar && (
              <Th className={classeColunaAcoes}>
                <span className="sr-only">Ações</span>
              </Th>
            )}
          </tr>
        </thead>
        <tbody>
          {captacoes.map((c) => (
            <tr key={c.id} className="group hover:bg-[var(--tabela-linha-hover)]">
              <Td>{c.videomakerNome}</Td>
              <Td className="whitespace-nowrap tabular-nums text-[var(--texto-suave)]">
                {formatarJanela(c.startsAt, c.endsAt)}
              </Td>
              <Td>
                {[c.client, c.subject].filter(Boolean).join(' · ') || (
                  <span className="text-[var(--texto-suave)]">—</span>
                )}
              </Td>
              <Td>{c.location ?? <span className="text-[var(--texto-suave)]">—</span>}</Td>
              <Td>
                <BadgeStatusCaptacao status={c.status} />
              </Td>
              {podeGerenciar && (
                <Td className={cn(classeColunaAcoes, 'group-hover:bg-[var(--tabela-linha-hover)]')}>
                  {c.status === 'Agendada' && <AcoesCaptacao id={c.id} rotulo={c.videomakerNome} />}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaWrapper>
  );
}
