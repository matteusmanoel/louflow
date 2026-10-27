import { exigirModulo } from '@/lib/auth';
import { listarAprovacoes } from '@/features/aprovacoes/consultas';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { ClipboardCheck } from 'lucide-react';

export default async function PaginaAprovacoes() {
  const usuario = await exigirModulo('aprovacoes');
  const aprovacoes = await listarAprovacoes(usuario);

  return (
    <ContainerPagina>
      <CabecalhoPagina grupo="Produção" titulo="Aprovações" />

      {aprovacoes.length === 0 ? (
        <EstadoVazio
          icone={ClipboardCheck}
          titulo="Nenhuma entrega aguardando aprovação"
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {aprovacoes.map((a) => (
            <li key={a.entregaId}>
              <Card>
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="text-[var(--texto-forte)]">{a.demandaTitulo}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="fonte-numero">v{a.versao}</span>
                      {a.editorNome ? <span> · {a.editorNome}</span> : null}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={a.link} target="_blank" rel="noopener noreferrer">
                      Ver arquivo
                    </a>
                  </Button>
                </CardHeader>
                {a.nota ? (
                  <CardContent>
                    <p className="m-0 text-sm text-[var(--texto-suave)]">{a.nota}</p>
                  </CardContent>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </ContainerPagina>
  );
}
