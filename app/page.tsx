import { redirect } from 'next/navigation';
import { exigirSessao } from '@/lib/auth';
import { rotaInicial } from '@/lib/modules';

export default async function Inicio() {
  const usuario = await exigirSessao('/');
  redirect(usuario.deveTrocarPin ? '/trocar-pin' : rotaInicial(usuario));
}
