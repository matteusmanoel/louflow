import { exigirModulo } from '@/lib/auth';
import { TelaDrive } from '@/features/drive/tela';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ pastaId: string }>; searchParams: Promise<{ visao?: string }> };

export default async function PaginaPastaDrive({ params, searchParams }: Props) {
  const usuario = await exigirModulo('drive');
  const { pastaId } = await params;
  const { visao } = await searchParams;
  return <TelaDrive usuario={usuario} modo="explorar" pastaId={pastaId} visao={visao} />;
}
