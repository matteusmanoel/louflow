import type { ReactNode } from 'react';
import type {
  AgendamentoTv,
  AlertaItemTv,
  AprovacaoTv,
  CaptacaoTv,
  CargaEditorTv,
  CorteTv,
  DemandaTv,
  EntregaTv,
  InfluencerTv,
  PayloadTv,
  RankingTv,
} from '@/lib/tv';

export const SLIDE_MS = 12_000;
const SLIDE_MS_LISTA = 1_600;
const SLIDE_MS_MAX = 26_000;
const SLIDE_CURTO = SLIDE_MS * 0.6;
const POR_TELA_INFLUENCER = 6;
const FUSO = 'America/Sao_Paulo';

export type SlideTv = { id: string; duracao: number; conteudo: ReactNode };

function duracaoLista(quantidade: number) {
  return Math.min(SLIDE_MS_MAX, SLIDE_MS + quantidade * SLIDE_MS_LISTA);
}

function plural(quantidade: number, um: string, muitos: string) {
  return quantidade === 1 ? um : muitos;
}

function contexto(partes: (string | null | undefined)[]) {
  const cheios = partes.filter((parte): parte is string => Boolean(parte));
  if (!cheios.length) return '—';
  return cheios.map((texto, indice) => (
    <span key={`${indice}-${texto}`}>
      {indice > 0 && <span className="sep">·</span>}
      {texto}
    </span>
  ));
}

function fmtDia(valor: string | null | undefined) {
  if (!valor) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [, mes, dia] = valor.split('-');
    return `${dia}/${mes}`;
  }
  return new Date(valor).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', timeZone: FUSO,
  });
}

function fmtHora(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: FUSO,
  });
}

function textoPrazo(dias: number | null) {
  if (dias === null) return 'Sem prazo';
  if (dias < 0) {
    const quantidade = Math.abs(dias);
    return `${quantidade} ${plural(quantidade, 'dia', 'dias')}`;
  }
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `${dias} dias`;
}

function legendaPrazo(dias: number | null) {
  if (dias === null) return 'a definir';
  if (dias < 0) return 'em atraso';
  if (dias <= 1) return 'prazo';
  return 'restantes';
}

function classePrazo(dias: number | null) {
  if (dias === null) return 'neutra';
  if (dias < 0) return 'critica';
  if (dias <= 1) return 'atencao';
  return 'ok';
}

function corPrazo(dias: number | null) {
  if (dias === null) return 'cor-suave';
  if (dias < 0) return 'cor-coral';
  if (dias <= 1) return 'cor-ambar';
  return 'cor-ink';
}

function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="slide-title">{children}</h2>;
}

function Vazio({ texto, sub }: { texto: string; sub?: string }) {
  return (
    <div className="center-wrap">
      <div className="vazio">
        <div className="vazio-texto">{texto}</div>
        {sub ? <div className="vazio-sub">{sub}</div> : null}
      </div>
    </div>
  );
}

function Lista({ children }: { children: ReactNode }) {
  return (
    <div className="fill-wrap">
      <div className="lista">{children}</div>
    </div>
  );
}

function Linha({ classe, children }: { classe: string; children: ReactNode }) {
  return <div className={`linha ${classe}`}>{children}</div>;
}

function Principal({ titulo, sub }: { titulo: string; sub: ReactNode }) {
  return (
    <div className="linha-main">
      <div className="linha-titulo">{titulo}</div>
      <div className="linha-sub">{sub}</div>
    </div>
  );
}

function Lado({ valor, legenda, cor }: { valor: string; legenda: string; cor: string }) {
  return (
    <div className="linha-lado">
      <div className={`linha-valor ${cor}`}>{valor}</div>
      <div className="linha-legenda">{legenda}</div>
    </div>
  );
}

function BadgePrioridade({ prioridade }: { prioridade: string }) {
  if (prioridade === 'Urgente') return <span className="badge coral">{prioridade}</span>;
  if (prioridade === 'Alta') return <span className="badge ambar">{prioridade}</span>;
  return <span className="badge suave">{prioridade}</span>;
}

function slideVisao(dados: PayloadTv): SlideTv {
  const resumo = dados.resumoMes;
  const cartoes = [
    { valor: resumo.emAndamento, rotulo: 'Em produção', cor: 'cor-ink' },
    { valor: resumo.aguardandoAprovacao, rotulo: 'Aguardando aprovação', cor: 'cor-ambar' },
    { valor: resumo.atrasadas, rotulo: 'Atrasadas', cor: resumo.atrasadas ? 'cor-coral' : 'cor-teal' },
    { valor: resumo.semEditor, rotulo: 'Sem editor', cor: resumo.semEditor ? 'cor-violeta' : 'cor-teal' },
  ];
  return {
    id: 'visao',
    duracao: SLIDE_MS,
    conteudo: (
      <>
        <Titulo>Como está a <b>operação</b> agora</Titulo>
        <div className="center-wrap">
          <div className="kpi-grid">
            {cartoes.map((cartao) => (
              <div key={cartao.rotulo} className="kpi-card">
                <div className={`kpi-value ${cartao.cor}`}>{cartao.valor}</div>
                <div className="kpi-label">{cartao.rotulo}</div>
              </div>
            ))}
          </div>
          <div className="kpi-rodape">
            <b>{resumo.concluidas}</b>{' '}
            {plural(resumo.concluidas, 'demanda concluída', 'demandas concluídas')} neste mês
          </div>
        </div>
      </>
    ),
  };
}

function slidePendentes(itens: DemandaTv[]): SlideTv | null {
  if (!itens.length) return null;
  return {
    id: 'pendentes',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>Demandas <b>pendentes</b></Titulo>
        <Lista>
          {itens.map((item) => (
            <Linha key={item.id} classe={classePrazo(item.diasParaPrazo)}>
              <BadgePrioridade prioridade={item.prioridade} />
              <Principal
                titulo={item.titulo}
                sub={contexto([item.editor, item.influencer, item.formato, item.status])}
              />
              <Lado
                valor={textoPrazo(item.diasParaPrazo)}
                legenda={legendaPrazo(item.diasParaPrazo)}
                cor={corPrazo(item.diasParaPrazo)}
              />
            </Linha>
          ))}
        </Lista>
      </>
    ),
  };
}

function slideAlertas(dados: PayloadTv): SlideTv {
  const { itens, totalAtrasadas, totalProximas } = dados.alertas;
  if (!itens.length) {
    return {
      id: 'alertas',
      duracao: SLIDE_CURTO,
      conteudo: (
        <>
          <Titulo>Alertas de <b>prazo</b></Titulo>
          <Vazio texto="Nenhum prazo em risco" sub="Tudo dentro do combinado" />
        </>
      ),
    };
  }
  const resumo = [
    totalAtrasadas ? `${totalAtrasadas} ${plural(totalAtrasadas, 'atrasada', 'atrasadas')}` : '',
    totalProximas ? `${totalProximas} vencendo` : '',
  ].filter(Boolean).join(' e ');
  return {
    id: 'alertas',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>
          Alertas de <b>prazo</b>
          {resumo ? ` · ${resumo}` : ''}
        </Titulo>
        <Lista>
          {itens.map((item, indice) => (
            <LinhaAlerta key={`${item.titulo}-${indice}`} item={item} />
          ))}
        </Lista>
      </>
    ),
  };
}

function LinhaAlerta({ item }: { item: AlertaItemTv }) {
  return (
    <Linha classe={item.atrasada ? 'critica' : 'atencao'}>
      <Principal
        titulo={item.titulo}
        sub={contexto([item.editor, item.influencer, `prazo ${fmtDia(item.prazo) || 'a definir'}`])}
      />
      <Lado
        valor={textoPrazo(item.diasParaPrazo)}
        legenda={item.atrasada ? 'em atraso' : legendaPrazo(item.diasParaPrazo)}
        cor={corPrazo(item.diasParaPrazo)}
      />
    </Linha>
  );
}

function slideAprovacoes(itens: AprovacaoTv[]): SlideTv {
  if (!itens.length) {
    return {
      id: 'aprovacoes',
      duracao: SLIDE_CURTO,
      conteudo: (
        <>
          <Titulo>Aprovações <b>pendentes</b></Titulo>
          <Vazio texto="Nada parado em aprovação" sub="A fila do influencer está limpa" />
        </>
      ),
    };
  }
  return {
    id: 'aprovacoes',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>Aprovações <b>pendentes</b></Titulo>
        <Lista>
          {itens.map((item) => {
            const critica = item.horasEspera >= 24;
            const espera = item.horasEspera >= 24 ? `${Math.floor(item.horasEspera / 24)}d` : `${item.horasEspera}h`;
            return (
              <Linha key={item.demandaId} classe={critica ? 'critica' : 'atencao'}>
                <span className="badge suave">v{item.versao}</span>
                <Principal
                  titulo={item.titulo}
                  sub={contexto([
                    item.influencer ? `aprova: ${item.influencer}` : '',
                    item.editor ? `entregue por ${item.editor}` : '',
                    fmtDia(item.desde) ? `${fmtDia(item.desde)} ${fmtHora(item.desde)}` : '',
                  ])}
                />
                <Lado valor={espera} legenda="esperando" cor={critica ? 'cor-coral' : 'cor-ambar'} />
              </Linha>
            );
          })}
        </Lista>
      </>
    ),
  };
}

function slideInfluencers(itens: InfluencerTv[]): SlideTv[] {
  const titulo = (
    <Titulo>Influencers que precisam <b>aprovar ou agendar conteúdo</b></Titulo>
  );
  if (!itens.length) {
    return [{
      id: 'influencers',
      duracao: SLIDE_CURTO,
      conteudo: (
        <>
          {titulo}
          <Vazio texto="Tudo em dia" sub="Nenhum influencer tem aprovação ou agendamento pendente" />
        </>
      ),
    }];
  }
  const telas: SlideTv[] = [];
  for (let inicio = 0; inicio < itens.length; inicio += POR_TELA_INFLUENCER) {
    const grupo = itens.slice(inicio, inicio + POR_TELA_INFLUENCER);
    telas.push({
      id: `influencers-${inicio}`,
      duracao: SLIDE_MS + 3_000,
      conteudo: (
        <>
          {titulo}
          <div className="influencer-wrap">
            <div className="influencer-grid" data-quantidade={grupo.length}>
              {grupo.map((item) => (
                <div key={item.nome} className="influencer-card">
                  <div className="influencer-nome">{item.nome}</div>
                  <div className="influencer-acoes">
                    {item.aprovar > 0 && (
                      <span className="influencer-acao aprovar"><b>{item.aprovar}</b> para aprovar</span>
                    )}
                    {item.agendar > 0 && (
                      <span className="influencer-acao agendar"><b>{item.agendar}</b> para agendar</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="influencer-rodape">A lista é atualizada quando a pendência é resolvida no LouFlow</div>
        </>
      ),
    });
  }
  return telas;
}

function slideEntregas(itens: EntregaTv[]): SlideTv | null {
  if (!itens.length) return null;
  return {
    id: 'entregas',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>Entregas dos <b>últimos dias</b></Titulo>
        <Lista>
          {itens.map((item, indice) => (
            <Linha key={`${item.titulo}-${indice}`} classe="neutra">
              <span className={`badge ${corSituacao(item.situacao)}`}>v{item.versao}</span>
              <Principal titulo={item.titulo} sub={contexto([item.editor, item.influencer, item.situacao])} />
              <Lado valor={fmtDia(item.data)} legenda={fmtHora(item.data) || 'entregue'} cor={corSituacaoTexto(item.situacao)} />
            </Linha>
          ))}
        </Lista>
      </>
    ),
  };
}

function corSituacao(situacao: string) {
  const valor = situacao.toLowerCase();
  if (valor.startsWith('aprovad')) return 'teal';
  if (valor.includes('ajuste')) return 'coral';
  return 'ambar';
}

function corSituacaoTexto(situacao: string) {
  const valor = situacao.toLowerCase();
  if (valor.startsWith('aprovad')) return 'cor-teal';
  if (valor.includes('ajuste')) return 'cor-coral';
  return 'cor-ambar';
}

function slideAgenda(itens: AgendamentoTv[]): SlideTv | null {
  if (!itens.length) return null;
  return {
    id: 'agenda',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>Postagens <b>agendadas</b></Titulo>
        <Lista>
          {itens.map((item, indice) => (
            <Linha key={`${item.quando}-${indice}`} classe="ok">
              <span className="badge suave">
                {item.marca} · {item.avulso ? (item.tipoConteudo ?? '—') : (item.plataforma || '—')}
              </span>
              <Principal titulo={item.titulo} sub={contexto([item.influencer, item.situacao])} />
              <Lado valor={fmtDia(item.quando)} legenda={fmtHora(item.quando)} cor="cor-teal" />
            </Linha>
          ))}
        </Lista>
      </>
    ),
  };
}

function slideCaptacoes(itens: CaptacaoTv[]): SlideTv | null {
  if (!itens.length) return null;
  return {
    id: 'captacoes',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>Captações <b>externas</b></Titulo>
        <Lista>
          {itens.map((item, indice) => (
            <Linha key={`${item.inicio}-${indice}`} classe="neutra">
              <Principal
                titulo={item.assunto || 'Captação'}
                sub={contexto([
                  item.videomaker ? `Videomaker ${item.videomaker}` : '',
                  item.influencer,
                  item.cliente,
                  item.local,
                ])}
              />
              <Lado
                valor={fmtDia(item.inicio)}
                legenda={[fmtHora(item.inicio), fmtHora(item.fim)].filter(Boolean).join('–')}
                cor="cor-violeta"
              />
            </Linha>
          ))}
        </Lista>
      </>
    ),
  };
}

function slideCortes(itens: CorteTv[]): SlideTv | null {
  if (!itens.length) return null;
  return {
    id: 'cortes',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>Cortes <b>em andamento</b></Titulo>
        <Lista>
          {itens.map((item, indice) => (
            <Linha key={`${item.titulo}-${indice}`} classe="neutra">
              <Principal
                titulo={item.titulo}
                sub={contexto([item.linhaEditorial, item.programa, item.situacao])}
              />
              <Lado valor={fmtDia(item.dataPostagem)} legenda="postagem" cor="cor-teal" />
            </Linha>
          ))}
        </Lista>
      </>
    ),
  };
}

function slideRanking(itens: RankingTv[]): SlideTv | null {
  if (!itens.length) return null;
  const disputam = itens.filter((item) => !item.staff);
  const staff = itens.filter((item) => item.staff);
  const posicoes = ['1º', '2º', '3º'];
  return {
    id: 'ranking',
    duracao: duracaoLista(disputam.length),
    conteudo: (
      <>
        <Titulo>Ranking do <b>mês</b> · nota de desempenho</Titulo>
        {disputam.length ? (
          <Lista>
            {disputam.map((item, indice) => (
              <Linha key={item.editor} classe={indice === 0 ? 'ok' : 'neutra'}>
                <div className={indice < 3 ? 'barra-pos medalha' : 'barra-pos'}>
                  {posicoes[indice] ?? `${indice + 1}º`}
                </div>
                <div className="barra-nome">{item.editor}</div>
                <div className="barra-track">
                  <div className="barra-fill" data-pct={String(Math.max(0, Math.min(100, item.nota)))} />
                </div>
                <div className="barra-score">{item.nota}</div>
              </Linha>
            ))}
          </Lista>
        ) : (
          <Vazio texto="Sem editores classificados" />
        )}
        {staff.length > 0 && (
          <div className="ranking-staff">
            {staff.map((item) => (
              <div key={item.editor} className="ranking-staff-rodape">
                <div className="ranking-staff-identidade">
                  <strong>{item.editor.toLocaleUpperCase('pt-BR')}</strong>
                  <span className="ranking-staff-selo">Staff</span>
                </div>
                <div className="ranking-staff-aviso">Não disputa o ranking</div>
                <div className="ranking-staff-metricas">
                  <span>{item.quantidade} atividades</span>
                  <span>
                    {item.demandasNota ? `${item.percentualAprovacao}% aprovação direta` : 'Aprovação —'}
                  </span>
                  <span>
                    {item.tempoMedioHoras
                      ? `${item.tempoMedioHoras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h tempo médio`
                      : 'Tempo médio —'}
                  </span>
                  <span>Nota informativa {item.nota}/100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    ),
  };
}

function slideProdutividade(dados: PayloadTv): SlideTv | null {
  const produtividade = dados.produtividade;
  if (!produtividade || !produtividade.totalConcluidas) return null;
  const corPrazo = produtividade.percentualNoPrazo >= 80
    ? 'cor-teal'
    : produtividade.percentualNoPrazo >= 60 ? 'cor-ambar' : 'cor-coral';
  const cartoes = [
    { valor: String(produtividade.totalConcluidas), unidade: '', rotulo: 'Concluídas no mês', cor: 'cor-teal' },
    { valor: String(produtividade.tempoMedioHoras), unidade: 'h', rotulo: 'Tempo médio', cor: 'cor-ink' },
    { valor: String(produtividade.percentualNoPrazo), unidade: '%', rotulo: 'Entregue no prazo', cor: corPrazo },
  ];
  return {
    id: 'produtividade',
    duracao: SLIDE_MS,
    conteudo: (
      <>
        <Titulo>Produtividade do <b>mês</b></Titulo>
        <div className="center-wrap">
          <div className="prod-grid">
            {cartoes.map((cartao) => (
              <div key={cartao.rotulo} className="prod-card">
                <div className={`prod-value ${cartao.cor}`}>
                  {cartao.valor}
                  {cartao.unidade ? <span className="prod-unidade">{cartao.unidade}</span> : null}
                </div>
                <div className="prod-label">{cartao.rotulo}</div>
              </div>
            ))}
          </div>
          {produtividade.porFormato.length > 0 && (
            <div className="prod-formatos">
              {produtividade.porFormato.map((item) => (
                <div key={item.formato} className="prod-chip">
                  {item.formato}<b>{item.quantidade}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    ),
  };
}

function slideCarga(itens: CargaEditorTv[]): SlideTv | null {
  if (!itens.length) return null;
  const topo = Math.max(...itens.map((item) => item.abertas), 1);
  return {
    id: 'carga',
    duracao: duracaoLista(itens.length),
    conteudo: (
      <>
        <Titulo>Carga da <b>equipe</b> · demandas em aberto</Titulo>
        <Lista>
          {itens.map((item) => {
            const classe = item.atrasadas >= 2 || item.abertas >= 6
              ? 'critica'
              : item.abertas === 0 ? 'ok' : 'neutra';
            return (
              <Linha key={item.editor} classe={classe}>
                <div className="barra-nome">{item.editor}</div>
                <div className="barra-track">
                  <div className="barra-fill" data-pct={String(Math.round((item.abertas / topo) * 100))} />
                </div>
                <div className="barra-score">{item.abertas}</div>
                <Lado
                  valor={item.disponibilidade}
                  legenda={item.atrasadas
                    ? `${item.atrasadas} ${plural(item.atrasadas, 'atrasada', 'atrasadas')}`
                    : 'em dia'}
                  cor={item.atrasadas ? 'cor-coral' : 'cor-suave'}
                />
              </Linha>
            );
          })}
        </Lista>
      </>
    ),
  };
}

function incluir(slides: SlideTv[], slide: SlideTv | SlideTv[] | null) {
  if (!slide) return;
  if (Array.isArray(slide)) slides.push(...slide);
  else slides.push(slide);
}

export function montarSlides(dados: PayloadTv): SlideTv[] {
  const slides: SlideTv[] = [];
  incluir(slides, slideVisao(dados));
  incluir(slides, slidePendentes(dados.demandasPendentes));
  incluir(slides, slideAlertas(dados));
  incluir(slides, slideAprovacoes(dados.aprovacoes));
  incluir(slides, slideInfluencers(dados.influencers));
  incluir(slides, slideEntregas(dados.entregas));
  incluir(slides, slideAgenda(dados.agenda));
  incluir(slides, slideCaptacoes(dados.captacoes));
  incluir(slides, slideCortes(dados.cortes));
  incluir(slides, slideRanking(dados.ranking));
  incluir(slides, slideProdutividade(dados));
  incluir(slides, slideCarga(dados.cargaEditores));
  if (!slides.length) {
    slides.push({
      id: 'vazio',
      duracao: SLIDE_MS,
      conteudo: <Vazio texto="Sem demandas para exibir" sub="O painel volta a preencher assim que houver movimento" />,
    });
  }
  return slides;
}
