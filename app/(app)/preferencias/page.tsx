import { exigirModulo } from '@/lib/auth';
import { listarPreferencias } from '@/features/notificacoes/consultas';
import { FormularioPreferencias } from '@/features/notificacoes/components/FormularioPreferencias';

export default async function PaginaPreferencias() {
  const usuario = await exigirModulo('preferencias');
  const preferencias = await listarPreferencias(usuario.id);

  return (
    <main
      style={{
        padding: '2rem 1.5rem',
        maxWidth: '42rem',
        margin: '0 auto',
        minWidth: 0,
      }}
    >
      <FormularioPreferencias preferencias={preferencias} />
    </main>
  );
}
