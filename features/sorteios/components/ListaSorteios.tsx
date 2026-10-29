'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
import { formatarData, formatarDataHora } from '@/lib/datas';
import { registrarRetiradaSorteio } from '../actions';
import type { Sorteio } from '../consultas';

function rotuloMes(mes: string): string {
  const [ano, numero] = mes.split('-');
  return numero && ano ? `${numero}/${ano}` : mes;
}

function BotaoRetirada({ id }: { id: string }) {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState(async () => {
    const resultado = await registrarRetiradaSorteio({ id });
    if (resultado.ok) router.refresh();
    return resultado.mensagem;
  }, null);

  return (
    <form action={acao} className="flex flex-col items-end gap-1">
      <Button type="submit" size="sm" disabled={pendente}>
        {pendente ? 'Registrando…' : 'Registrar retirada'}
      </Button>
      {estado && <span className="text-xs text-[var(--texto-suave)]">{estado}</span>}
    </form>
  );
}

export function ListaSorteios({ registros, total }: { registros: Sorteio[]; total: number }) {
  if (registros.length === 0) {
    return <EstadoVazio titulo="Nenhum sorteio" descricao="Nenhum prêmio corresponde à busca." />;
  }

  return (
    <div className="grid gap-2">
      {total > registros.length && (
        <p className="text-sm text-[var(--texto-suave)]">
          Mostrando {registros.length} de {total}.
        </p>
      )}
      <TabelaWrapper>
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Ganhador</Th>
              <Th>Mês</Th>
              <Th>Campanha</Th>
              <Th>Prêmio</Th>
              <Th>Prazo</Th>
              <Th>Retirada</Th>
            </tr>
          </thead>
          <tbody>
            {registros.map((item) => (
              <tr key={item.id}>
                <Td>
                  <div>{item.ganhador}</div>
                  {item.observacoes && (
                    <p className="mt-1 max-w-xs text-xs text-[var(--texto-suave)]">{item.observacoes}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--texto-suave)]">{formatarDataHora(item.cadastradoEm)}</p>
                </Td>
                <Td>{rotuloMes(item.mes)}</Td>
                <Td>{item.campanha || '—'}</Td>
                <Td>{item.premio}</Td>
                <Td>{formatarData(item.prazoRetirada)}</Td>
                <Td>
                  {item.retirou ? (
                    <Badge variant="secondary">Retirou {formatarData(item.retiradaEm)}</Badge>
                  ) : (
                    <BotaoRetirada id={item.id} />
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaWrapper>
    </div>
  );
}
