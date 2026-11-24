import Image from 'next/image';
import { redirect } from 'next/navigation';
import { exigirSessao } from '@/lib/auth';
import { destinoFinal } from '@/lib/destino';
import { FormTrocarPin } from '@/features/acesso/components/FormTrocarPin';
import s from '../auth.module.css';

export default async function TrocarPin({ searchParams }: { searchParams: Promise<{ para?: string }> }) {
  const { para } = await searchParams;
  const destino = destinoFinal(para);
  const usuario = await exigirSessao(destino === '/' ? '/trocar-pin' : `/trocar-pin?para=${encodeURIComponent(destino)}`);
  if (!usuario.deveTrocarPin) redirect(destino);

  return (
    <main className={s.pagina}>
      <div className={s.cartao}>
        <Image className={s.logo} src="/logo-loumar.png" alt="Loumar" width={210} height={40} priority />
        <h1 className={s.titulo}>Novo PIN</h1>
        <p className={s.subtitulo}>Defina um PIN pessoal para continuar.</p>
        <FormTrocarPin para={destino} />
      </div>
    </main>
  );
}
