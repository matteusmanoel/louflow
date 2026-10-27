'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors } from 'lucide-react';
import type { Corte } from '../consultas';
import { FormConcluirCorte } from './FormConcluirCorte';
import { AcoesLinha } from '@/components/ui/acoes-linha';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Th, Td, classeColunaAcoes } from '@/components/ui/tabela';
import { formatarData } from '@/lib/datas';
import { cn } from '@/lib/utils';

const LABEL_PROGRAMA: Record<string, string> = {
  'Destino Iguaçu News': 'Destino Iguaçu',
  'Descubra Foz': 'Descubra Foz',
  Outros: 'Outros',
};

const LINHA_VARIANTE: Record<string, 'prioridade-normal' | 'prioridade-alta' | 'prioridade-urgente' | 'secondary'> = {
  Viral: 'prioridade-urgente',
  Comunidade: 'prioridade-normal',
  Educacional: 'secondary',
};

const COLUNAS = ['Título', 'Programa', 'Linha', 'Postagem', 'Editor', 'Qtd.', 'Status'];

export function ListaCortes({
  cortes,
  podeConcluir = false,
}: {
  cortes: Corte[];
  podeConcluir?: boolean;
}) {
  const router = useRouter();
  const [corteAberto, setCorteAberto] = useState<Corte | null>(null);

  if (cortes.length === 0) {
    return (
      <EstadoVazio
        icone={Scissors}
        titulo="Nenhum corte cadastrado"
        descricao="Cadastre um corte para que ele apareça aqui."
      />
    );
  }

  return (
    <>
      <TabelaWrapper>
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr>
              {COLUNAS.map((col) => (
                <Th key={col}>{col}</Th>
              ))}
              {podeConcluir && (
                <Th className={cn(classeColunaAcoes, 'bg-[var(--tabela-cabecalho-fundo)]')}>
                  <span className="sr-only">Ações</span>
                </Th>
              )}
            </tr>
          </thead>
          <tbody>
            {cortes.map((c) => (
              <tr key={c.id} className="group transition-colors hover:bg-[var(--tabela-linha-hover)]">
                <Td className="max-w-[16rem] truncate">
                  {c.linkVideo ? (
                    <a
                      href={c.linkVideo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[var(--loumar-700)] hover:underline"
                    >
                      {c.titulo}
                    </a>
                  ) : (
                    c.titulo
                  )}
                </Td>
                <Td className="whitespace-nowrap">{LABEL_PROGRAMA[c.programaOrigem] ?? c.programaOrigem}</Td>
                <Td>
                  <Badge variant={LINHA_VARIANTE[c.linhaEditorial] ?? 'secondary'}>
                    {c.linhaEditorial}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap tabular-nums">{formatarData(c.dataPostagem)}</Td>
                <Td>{c.editorNome}</Td>
                <Td className="fonte-numero">{c.quantidadeProduzida ?? '—'}</Td>
                <Td>
                  <Badge variant={c.status === 'Concluído' ? 'secondary' : 'prioridade-normal'}>
                    {c.status}
                  </Badge>
                </Td>
                {podeConcluir && (
                  <Td className={cn(classeColunaAcoes, 'group-hover:bg-[var(--tabela-linha-hover)]')}>
                    <AcoesLinha
                      rotulo={c.titulo}
                      itens={
                        c.status === 'Concluído'
                          ? []
                          : [{ rotulo: 'Concluir', onSelect: () => setCorteAberto(c) }]
                      }
                    />
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaWrapper>

      <Dialog open={corteAberto != null} onOpenChange={(aberto) => { if (!aberto) setCorteAberto(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir corte</DialogTitle>
            {corteAberto ? <DialogDescription>{corteAberto.titulo}</DialogDescription> : null}
          </DialogHeader>
          {corteAberto ? (
            <FormConcluirCorte
              corte={corteAberto}
              aoCancelar={() => setCorteAberto(null)}
              aoSalvar={() => {
                setCorteAberto(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
