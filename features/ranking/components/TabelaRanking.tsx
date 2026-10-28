import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
import type { ProdutividadeEditor } from '@/features/metricas/consultas';
import { formatarDuracao } from '../duracao';

export function TabelaRanking({ linhas }: { linhas: ProdutividadeEditor[] }) {
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
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr>
            <Th>Editor</Th>
            <Th>Concluídas</Th>
            <Th>Em andamento</Th>
            <Th>Atrasadas</Th>
            <Th>Tempo médio</Th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.editorId}>
              <Td>{linha.nome}</Td>
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
