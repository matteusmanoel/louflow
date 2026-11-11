import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

/** Links antigos e o retorno de criar/editar caem na mesma tela da lista. */
export default async function PaginaArtigoWiki({ params }: Props) {
  const { id } = await params;
  redirect(`/wiki?artigo=${encodeURIComponent(id)}`);
}
