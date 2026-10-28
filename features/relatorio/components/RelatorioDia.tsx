import type { ReactNode } from 'react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
import { formatarData, formatarDataHora } from '@/lib/datas';
import type { RelatorioDiario } from '../consultas';

const VARIANTES: Record<string, BadgeVariant> = {
  'Não iniciada': 'leitura',
  'Em execução': 'prioridade-normal',
  Pausada: 'prioridade-alta',
  Aprovação: 'aprovacao',
  'Ajustes solicitados': 'prioridade-urgente',
  Concluída: 'secondary',
  Reprovada: 'prioridade-urgente',
  Cancelada: 'leitura',
};

function SeloStatus({ status }: { status: string }) {
  return <Badge variant={VARIANTES[status] ?? 'outline'}>{status}</Badge>;
}

function Secao({
  id,
  titulo,
  total,
  vazio,
  children,
}: {
  id: string;
  titulo: string;
  total: number;
  vazio: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2" aria-labelledby={id}>
      <h2 id={id} className="text-base font-semibold text-[var(--texto-forte)]">
        {titulo} <span className="font-medium text-[var(--texto-suave)]">({total})</span>
      </h2>
      {total === 0 ? <EstadoVazio titulo={vazio} className="py-6" /> : children}
    </section>
  );
}

function Tabela({ children }: { children: ReactNode }) {
  return (
    <TabelaWrapper>
      <table className="w-full border-collapse text-sm">{children}</table>
    </TabelaWrapper>
  );
}

export function RelatorioDia({ relatorio }: { relatorio: RelatorioDiario }) {
  return (
    <div className="grid gap-6">
      <Secao
        id="relatorio-entraram"
        titulo="Entraram"
        total={relatorio.entraram.length}
        vazio="Nenhuma demanda entrou neste dia."
      >
        <Tabela>
          <thead>
            <tr>
              <Th>Demanda</Th>
              <Th>Status</Th>
              <Th>Entrada</Th>
            </tr>
          </thead>
          <tbody>
            {relatorio.entraram.map((item) => (
              <tr key={item.id}>
                <Td>
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {item.titulo}
                    {item.lixeira && <Badge variant="outline">Lixeira</Badge>}
                  </span>
                </Td>
                <Td>
                  <SeloStatus status={item.status} />
                </Td>
                <Td>{formatarDataHora(item.criadaEm)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Secao>

      <Secao
        id="relatorio-status"
        titulo="Mudaram de status"
        total={relatorio.mudaramStatus.length}
        vazio="Nenhuma demanda mudou de status neste dia."
      >
        <Tabela>
          <thead>
            <tr>
              <Th>Demanda</Th>
              <Th>Novo status</Th>
              <Th>Quando</Th>
            </tr>
          </thead>
          <tbody>
            {relatorio.mudaramStatus.map((item, indice) => (
              <tr key={`${item.quando.toISOString()}-${indice}`}>
                <Td>{item.titulo}</Td>
                <Td>
                  <SeloStatus status={item.status} />
                </Td>
                <Td>{formatarDataHora(item.quando)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Secao>

      <Secao
        id="relatorio-concluidas"
        titulo="Concluíram"
        total={relatorio.concluiram.length}
        vazio="Nenhuma demanda foi concluída neste dia."
      >
        <Tabela>
          <thead>
            <tr>
              <Th>Demanda</Th>
              <Th>Concluída em</Th>
            </tr>
          </thead>
          <tbody>
            {relatorio.concluiram.map((item) => (
              <tr key={item.id}>
                <Td>
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {item.titulo}
                    {item.lixeira && <Badge variant="outline">Lixeira</Badge>}
                  </span>
                </Td>
                <Td>{formatarDataHora(item.concluidaEm)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Secao>

      <Secao
        id="relatorio-atrasadas"
        titulo="Atrasadas no dia"
        total={relatorio.atrasadas.length}
        vazio="Nenhuma demanda estava atrasada neste dia."
      >
        <Tabela>
          <thead>
            <tr>
              <Th>Demanda</Th>
              <Th>Status</Th>
              <Th>Prazo</Th>
            </tr>
          </thead>
          <tbody>
            {relatorio.atrasadas.map((item) => (
              <tr key={item.id}>
                <Td>{item.titulo}</Td>
                <Td>
                  <SeloStatus status={item.status} />
                </Td>
                <Td>{formatarData(item.prazo)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Secao>
    </div>
  );
}
