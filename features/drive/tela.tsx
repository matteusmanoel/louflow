import { notFound } from 'next/navigation';
import { linkAcessivel } from '@/lib/armazenamento';
import type { UsuarioSessao } from '@/lib/session';
import { Explorador } from './components/Explorador';
import { abrirPasta, consultarCota, listarDestinos, listarLixeira, listarRaiz } from './consultas';
import { lerVisao } from './formato';
import type { ItemDrive } from './tipos';

async function assinar(itens: ItemDrive[]): Promise<ItemDrive[]> {
  return Promise.all(itens.map(async (item) => {
    if (!item.url) return item;
    const [url, urlDownload] = await Promise.all([
      linkAcessivel(item.url, { nome: item.nome }),
      linkAcessivel(item.url, { baixar: true, nome: item.nome }),
    ]);
    return { ...item, url: url ?? item.url, urlDownload: urlDownload ?? item.url };
  }));
}

export async function TelaDrive({
  usuario,
  modo,
  pastaId,
  visao,
}: {
  usuario: UsuarioSessao;
  modo: 'explorar' | 'lixeira';
  pastaId: string | null;
  visao?: string;
}) {
  const vista = modo === 'lixeira'
    ? await listarLixeira(usuario)
    : pastaId
      ? await abrirPasta(usuario, pastaId)
      : await listarRaiz(usuario);
  if (!vista) notFound();
  const [cota, destinos, itens] = await Promise.all([
    consultarCota(),
    modo === 'explorar' ? listarDestinos(usuario) : Promise.resolve([]),
    assinar(vista.itens),
  ]);
  const caminho = modo === 'lixeira' ? '/drive/lixeira' : pastaId ? `/drive/${pastaId}` : '/drive';

  return (
    <Explorador
      modo={modo}
      caminho={caminho}
      visao={lerVisao(visao)}
      pastaId={pastaId}
      nome={vista.nome}
      detalhe={vista.detalhe}
      trilha={vista.trilha}
      itens={itens}
      cota={cota}
      destinos={destinos}
    />
  );
}
