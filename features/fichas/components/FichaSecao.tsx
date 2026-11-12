import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { obterFichaEnviadaDb, obterFichaTecnicaDb } from '@/features/fichas/consultas';
import { formatarData } from '@/lib/datas';
import { FormFichaTecnica } from './FormFichaTecnica';
import { EditarFicha } from './EditarFicha';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { FileText } from 'lucide-react';

/**
 * Seção reservada do detalhe da Demanda: Ficha Técnica da Demanda.
 * Dona: S1-11 (#11566). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function FichaSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  const ficha = await obterFichaTecnicaDb(demandaId);
  // Ficha enviada pelo Influencer: a leitura é conferida no servidor (dono, Editor da Demanda, Fila, Administrador).
  const enviada = await obterFichaEnviadaDb(demandaId, usuario);
  const podeEditar = usuario.permissoes.editarDemandas;

  return (
    <section
      className="flex flex-col gap-4 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-5 shadow-[var(--sombra-card)]"
    >
      <h2 className="text-base font-semibold text-[var(--texto-forte)] m-0">Ficha Técnica</h2>

      {!ficha && !enviada && !podeEditar && (
        <EstadoVazio
          icone={FileText}
          titulo="Nenhuma ficha técnica"
          descricao="A ficha técnica desta demanda ainda não foi preenchida."
        />
      )}

      {ficha && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-6 gap-y-3">
          {ficha.formato && <Detalhe rotulo="Formato" valor={ficha.formato} />}
          {ficha.duracaoSegundos != null && (
            <Detalhe rotulo="Duração" valor={formatarDuracao(ficha.duracaoSegundos)} />
          )}
          {ficha.plataformas.length > 0 && (
            <Detalhe rotulo="Plataformas" valor={ficha.plataformas.join(', ')} />
          )}
          {ficha.briefing && (
            <div className="col-span-full">
              <Detalhe rotulo="Briefing" valor={ficha.briefing} multiline />
            </div>
          )}
          {ficha.observacoesTecnicas && (
            <div className="col-span-full">
              <Detalhe rotulo="Observações Técnicas" valor={ficha.observacoesTecnicas} multiline />
            </div>
          )}
        </div>
      )}

      {enviada && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-6 gap-y-3" data-ficha-enviada>
          <Detalhe rotulo="Enviada por" valor={`${enviada.enviadaPor} em ${formatarData(enviada.enviadaEm.toISOString().slice(0, 10))}`} />
          {enviada.previsaoPublicacao && (
            <Detalhe rotulo="Previsão de publicação" valor={formatarData(enviada.previsaoPublicacao)} />
          )}
          {enviada.plataforma && <Detalhe rotulo="Plataforma" valor={enviada.plataforma} />}
          {enviada.formatoConteudo && <Detalhe rotulo="Formato do conteúdo" valor={enviada.formatoConteudo} />}
          {enviada.editorSugerido && <Detalhe rotulo="Editor sugerido" valor={enviada.editorSugerido} />}
          {enviada.linkArquivos && (
            <div className="col-span-full">
              <div className="mb-0.5 text-xs font-medium text-[var(--texto-suave)]">Link de arquivos</div>
              <a
                href={enviada.linkArquivos}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-[var(--loumar-700)]"
              >
                {enviada.linkArquivos}
              </a>
            </div>
          )}
          {(
            [
              ['Observação ao editor', enviada.observacaoEditor],
              ['Roteiro', enviada.roteiro],
              ['Cabeça', enviada.cabeca],
              ['Sonora', enviada.sonora],
              ['Informações', enviada.informacoes],
              ['Roteiro escrito', enviada.roteiroEscrito],
              ['GC / Lettering', enviada.gcLettering],
              ['Material em SSD', enviada.materialSsd],
              ['Referências visuais', enviada.referenciasVisuais],
            ] as const
          ).map(([rotulo, valor]) =>
            valor ? (
              <div key={rotulo} className="col-span-full">
                <Detalhe rotulo={rotulo} valor={valor} multiline />
              </div>
            ) : null,
          )}
        </div>
      )}

      {podeEditar && (
        <EditarFicha key={ficha?.updatedAt?.toISOString() ?? 'nova'} temFicha={ficha != null}>
          <FormFichaTecnica demandaId={demandaId} ficha={ficha} />
        </EditarFicha>
      )}
    </section>
  );
}

// ---- helpers ----------------------------------------------------------------

function Detalhe({ rotulo, valor, multiline }: { rotulo: string; valor: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--texto-suave)] mb-0.5">{rotulo}</div>
      {multiline ? (
        <p className="text-sm text-[var(--texto-forte)] m-0 whitespace-pre-wrap">{valor}</p>
      ) : (
        <div className="text-sm text-[var(--texto-forte)]">{valor}</div>
      )}
    </div>
  );
}

function formatarDuracao(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
