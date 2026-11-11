import { exigirModulo } from '@/lib/auth';
import { TelaDrive } from '@/features/drive/tela';

export const dynamic = 'force-dynamic';

export default async function PaginaLixeiraDrive({ searchParams }: { searchParams: Promise<{ visao?: string }> }) {
  const usuario = await exigirModulo('drive');
  const { visao } = await searchParams;
  return <TelaDrive usuario={usuario} modo="lixeira" pastaId={null} visao={visao} />;
}
