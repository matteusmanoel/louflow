import { linkAcessivel } from '@/lib/armazenamento';
import { exigirModulo } from '@/lib/auth';
import { listarAprovacoes } from '@/features/aprovacoes/consultas';
import { linkParaCartao } from '@/features/aprovacoes/link-entrega';
import { ListaAprovacoes } from '@/features/aprovacoes/components/ListaAprovacoes';
import { listarArquivosEntregas } from '@/features/arquivos/consultas';
import { listarContasAgendaveis } from '@/features/instagram/consultas';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaAprovacoes() {
  const usuario = await exigirModulo('aprovacoes');
  const [aprovacoesBrutas, contas] = await Promise.all([
    listarAprovacoes(usuario),
    listarContasAgendaveis(),
  ]);
  const arquivos = await listarArquivosEntregas(aprovacoesBrutas.map((item) => item.entregaId));
  const itens = await Promise.all(
    aprovacoesBrutas.map(async (item) => {
      const arquivosBrutos = arquivos.filter((arquivo) => arquivo.entregaId === item.entregaId);
      const daEntrega = await Promise.all(
        arquivosBrutos.map(async (arquivo) => ({
          id: arquivo.id,
          nome: arquivo.nome,
          mime: arquivo.mime,
          url: (await linkAcessivel(arquivo.url)) ?? arquivo.url,
        })),
      );
      const podeAgendar =
        daEntrega.length > 0 &&
        contas.length > 0 &&
        (usuario.id === item.influencerId || usuario.permissoes.conectarInstagram);
      return {
        entregaId: item.entregaId,
        demandaId: item.demandaId,
        demandaTitulo: item.demandaTitulo,
        versao: item.versao,
        editorNome: item.editorNome,
        nota: item.nota,
        podeAjustar: usuario.perfil !== 'Administrador',
        podeAgendar,
        arquivos: daEntrega,
        link: linkParaCartao(
          item.link,
          arquivosBrutos.map((arquivo) => arquivo.url),
          (await linkAcessivel(item.link)) ?? item.link,
        ),
      };
    }),
  );

  return (
    <ContainerPagina>
      <CabecalhoPagina grupo="Produção" titulo="Aprovações" />

      <ListaAprovacoes itens={itens} contas={contas} />
    </ContainerPagina>
  );
}
