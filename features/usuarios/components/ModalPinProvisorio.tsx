'use client';

import { useEffect, useRef } from 'react';
import { Botao, Cartao } from '@/components/ui';
import s from './usuarios.module.css';

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
    <dialog ref={dialogRef} className={s.modal} aria-modal="true" aria-labelledby="modal-titulo">
      <Cartao>
        <h2 id="modal-titulo" className={s.modalTitulo}>
          PIN Provisório
        </h2>
        <p className={s.modalAviso}>
          Anote e entregue este PIN pessoalmente ao Usuário. <strong>Ele não será exibido novamente.</strong>
        </p>
        <div className={s.pinDisplay} aria-label={`PIN provisório: ${pin}`}>
          {pin}
        </div>
        <p className={s.modalSub}>
          O Usuário será obrigado a trocar o PIN no primeiro acesso.
        </p>
        <Botao onClick={onFechar} variante="principal">
          Entendi — fechar
        </Botao>
      </Cartao>
    </dialog>
  );
}
