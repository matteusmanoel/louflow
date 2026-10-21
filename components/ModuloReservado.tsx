import { modulo } from '@/lib/modules';
import { Cartao, TextoSuave, Titulo } from './ui';

/** Placeholder da rota reservada. A fatia dona substitui o conteúdo de `app/(app)/<slug>/page.tsx`. */
export function ModuloReservado({ slug }: { slug: string }) {
  const m = modulo(slug);
  return (
    <Cartao>
      <Titulo sobre={m?.grupo}>{m?.rotulo ?? slug}</Titulo>
      <TextoSuave>Módulo em construção ({m?.fatia}).</TextoSuave>
    </Cartao>
  );
}
