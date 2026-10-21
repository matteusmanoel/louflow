import Image from 'next/image';
import { redirect } from 'next/navigation';
import { exigirSessao } from '@/lib/auth';
import { FormTrocarPin } from '@/features/acesso/components/FormTrocarPin';
import s from '../auth.module.css';

export default async function TrocarPin() {
  const usuario = await exigirSessao('/trocar-pin');
  if (!usuario.deveTrocarPin) redirect('/');

  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Image className={s.logo} src="/logo-loumar.png" alt="Loumar" width={210} height={40} priority />
        <h1 className={s.titulo}>Novo PIN</h1>
        <p className={s.subtitulo}>Defina um PIN pessoal para continuar.</p>
        <FormTrocarPin />
      </div>
    </main>
  );
}
