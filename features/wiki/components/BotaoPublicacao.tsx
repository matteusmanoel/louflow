'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { alterarPublicacaoArtigoWiki } from '../actions';
import { Button } from '@/components/ui/button';
import { mostrarFeedback } from '@/lib/toast';

export function BotaoPublicacao({ id, publicado }: { id: string; publicado: boolean }) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [estado, setEstado] = useState(publicado);

  function alternar() {
    if (pendente) return;
    const proximo = !estado;
    iniciarTransicao(async () => {
      const resultado = await alterarPublicacaoArtigoWiki({ id, is_published: proximo });
      mostrarFeedback(resultado);
      if (!resultado.ok) return;
      setEstado(proximo);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={alternar} disabled={pendente}>
      {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {estado ? 'Despublicar' : 'Publicar'}
    </Button>
  );
}
