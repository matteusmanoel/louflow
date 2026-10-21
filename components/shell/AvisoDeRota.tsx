'use client';

import { useSearchParams } from 'next/navigation';
import { Aviso } from '@/components/ui';

const MENSAGENS: Record<string, string> = {
  'sem-permissao': 'Você não tem permissão para acessar aquela página.',
};

export function AvisoDeRota() {
  const aviso = useSearchParams().get('aviso');
  const mensagem = aviso ? MENSAGENS[aviso] : undefined;
  return mensagem ? <Aviso>{mensagem}</Aviso> : null;
}
