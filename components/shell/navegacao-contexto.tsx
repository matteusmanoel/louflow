'use client';

import { createContext, useContext } from 'react';

type Navegacao = {
  menuAberto: boolean;
  setMenuAberto: (aberto: boolean) => void;
};

export const NavegacaoContexto = createContext<Navegacao>({
  menuAberto: false,
  setMenuAberto: () => {},
});

export function useNavegacao() {
  return useContext(NavegacaoContexto);
}
