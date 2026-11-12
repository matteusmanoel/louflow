import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
import type { LinhaRanking } from '../consultas';
import { formatarDuracao } from '../duracao';

export function TabelaRanking({ linhas }: { linhas: LinhaRanking[] }) {
  if (linhas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma produção no período"
        descricao="Não há demandas nem ciclos de edição encerrados entre as datas escolhidas."
      />
    );
  }

  return (
    <TabelaWrapper>
      <table className="w-full min-w-[48rem] border-collapse text-sm">
        <thead>
          <tr>
            <Th>Posição</Th>
            <Th>Editor</Th>
            <Th>Nota</Th>
            <Th>Concluídas</Th>
            <Th>Em andamento</Th>
            <Th>Atrasadas</Th>
            <Th>Tempo médio</Th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.editorId}>
              <Td className="fonte-numero">{linha.posicao ? `${linha.posicao}º` : '—'}</Td>
              <Td>
                {linha.nome}
                {linha.staff && <span className="ml-2 text-xs text-[var(--texto-suave)]">nota informativa</span>}
              </Td>
              <Td className="fonte-numero">{linha.nota === null ? '—' : linha.nota.toFixed(1).replace('.', ',')}</Td>
              <Td className="fonte-numero">{linha.concluidas}</Td>
              <Td className="fonte-numero">{linha.emAndamento}</Td>
              <Td className="fonte-numero">{linha.atrasadas}</Td>
              <Td className="fonte-numero">{formatarDuracao(linha.tempoMedioMs)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaWrapper>
  );
}
