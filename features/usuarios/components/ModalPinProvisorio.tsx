'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';

type Props = {
  pin: string;
  onFechar: () => void;
};

/**
 * Exibe o PIN provisório uma única vez ao Administrador.
 * Não há como recuperá-lo depois — o botão "Entendi" remove o modal.
 */
export function ModalPinProvisorio({ pin, onFechar }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="modal-titulo"
      className="rounded-[var(--raio-modal)] border-0 shadow-[var(--sombra-modal)] bg-transparent p-0 backdrop:bg-[var(--overlay-modal)]"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle id="modal-titulo">PIN Provisório</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertDescription>
              Anote e entregue este PIN pessoalmente ao Usuário.{' '}
              <strong>Ele não será exibido novamente.</strong>
            </AlertDescription>
          </Alert>

          <div
            className="fonte-numero text-center text-3xl font-bold tracking-[0.3em] py-4 rounded-[var(--raio-card)] bg-[var(--loumar-50)] text-[var(--loumar-700)] select-all"
            aria-label={`PIN provisório: ${pin}`}
          >
            {pin}
          </div>

          <p className="text-sm text-[var(--texto-suave)]">
            O Usuário será obrigado a trocar o PIN no primeiro acesso.
          </p>

          <RodapeAcoes
            primaria={
              <Button type="button" onClick={onFechar} className="w-full sm:w-auto">
                Entendi — fechar
              </Button>
            }
          />
        </CardContent>
      </Card>
    </dialog>
  );
}
