import Image from 'next/image';
import { redirect } from 'next/navigation';
import { obterSessao } from '@/lib/auth';
import { FormLogin } from '@/features/acesso/components/FormLogin';
import s from '../auth.module.css';

export default async function Login({ searchParams }: { searchParams: Promise<{ para?: string }> }) {
  if (await obterSessao()) redirect('/');
  const { para } = await searchParams;

  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Image className={s.logo} src="/logo-loumar.png" alt="Loumar" width={210} height={40} priority />
        <h1 className={s.titulo}>LouFlow</h1>
        <p className={s.subtitulo}>Entre com seu e-mail e PIN.</p>
        <FormLogin para={para} />
      </div>
    </main>
  );
}
