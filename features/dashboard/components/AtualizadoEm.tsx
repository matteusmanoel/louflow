'use client';

import { useSincronizacao } from '@/components/shell/useSincronizacao';

function hora(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(data);
}

export function AtualizadoEm() {
  const atualizadoEm = useSincronizacao();
  return (
    <p className="text-xs text-[var(--texto-suave)]" role="status">
      {atualizadoEm ? `Atualizado automaticamente às ${hora(atualizadoEm)}` : 'Sincronizando o painel'}
    </p>
  );
}
