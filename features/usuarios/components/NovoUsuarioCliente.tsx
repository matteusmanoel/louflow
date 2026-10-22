'use client';

import { useState } from 'react';
import { criarUsuario } from '@/features/usuarios/actions';
import { FormularioUsuario } from './FormularioUsuario';
import { ModalPinProvisorio } from './ModalPinProvisorio';
import type { Resultado } from '@/lib/action';

export function NovoUsuarioCliente() {
  const [pinProvisorio, setPinProvisorio] = useState<string | null>(null);

  async function acaoCriar(entrada: unknown): Promise<Resultado<{ pin: string; usuarioId: string } | null>> {
    return criarUsuario(entrada);
  }

  return (
    <>
      {pinProvisorio && (
        <ModalPinProvisorio pin={pinProvisorio} onFechar={() => setPinProvisorio(null)} />
      )}
      <FormularioUsuario acao={acaoCriar} onPinGerado={(pin) => setPinProvisorio(pin)} />
    </>
  );
}
