import Link from 'next/link';
import { exigirModulo } from '@/lib/auth';
import { env } from '@/lib/env';
import { listarIntegracaoInstagram } from '@/features/instagram/consultas';
import { FormNovoPortfolio } from '@/features/instagram/components/FormNovoPortfolio';
import { CartaoPortfolio } from '@/features/instagram/components/CartaoPortfolio';
import { FormPublicacao } from '@/features/instagram/components/FormPublicacao';
import { ListaPublicacoes } from '@/features/instagram/components/ListaPublicacoes';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Share2 } from 'lucide-react';

export default async function PaginaInstagram() {
  await exigirModulo('instagram');
  const { portfolios, publicacoes } = await listarIntegracaoInstagram();
  const chavePronta = env.metaTokenKey !== null;
  const contasOk = portfolios.flatMap((portfolio) => portfolio.contas.filter((conta) => conta.status === 'ok'));

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Administração"
        titulo="Instagram"
        descricao="Um registro por Business Manager. O Ok em cada conta libera o agendamento."
        acao={
          <Button asChild variant="outline">
            <Link href="/wiki?artigo=wiki-08">Abrir o guia</Link>
          </Button>
        }
      />

      {!chavePronta && (
        <Alert variant="warning">
          <AlertDescription>
            Falta a chave de criptografia no ambiente. Defina META_TOKEN_KEY antes de salvar um token.
          </AlertDescription>
        </Alert>
      )}

      <ol className="grid gap-2 text-sm text-[var(--texto-suave)] sm:grid-cols-4">
        <li className="rounded-[var(--raio-card)] border border-[var(--borda-app)] px-3 py-2">1. Cadastre o Business Manager</li>
        <li className="rounded-[var(--raio-card)] border border-[var(--borda-app)] px-3 py-2">2. Configure o token na Meta, pelo guia</li>
        <li className="rounded-[var(--raio-card)] border border-[var(--borda-app)] px-3 py-2">3. Cole o token e sincronize</li>
        <li className="rounded-[var(--raio-card)] border border-[var(--borda-app)] px-3 py-2">4. Agende só nas contas com Ok</li>
      </ol>

      <FormNovoPortfolio />

      {portfolios.length === 0 ? (
        <EstadoVazio
          icone={Share2}
          titulo="Nenhum Business Manager"
          descricao="Cadastre um para cada BM. O guia descreve o que fazer na Meta antes de colar o token."
        />
      ) : (
        portfolios.map((portfolio) => <CartaoPortfolio key={portfolio.id} portfolio={portfolio} chavePronta={chavePronta} />)
      )}

      {contasOk.length > 0 && <FormPublicacao contas={contasOk} />}
      <ListaPublicacoes itens={publicacoes} />
    </ContainerPagina>
  );
}
