'use client';

import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MENSAGENS: Record<string, string> = {
  'sem-permissao': 'Você não tem permissão para acessar aquela página.',
};

export function AvisoDeRota() {
  const aviso = useSearchParams().get('aviso');
  const mensagem = aviso ? MENSAGENS[aviso] : undefined;
  return mensagem ? (
    <Alert variant="warning">
      <AlertDescription>{mensagem}</AlertDescription>
    </Alert>
  ) : null;
}
