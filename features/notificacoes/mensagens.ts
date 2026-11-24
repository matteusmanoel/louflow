import type { Notificacao } from '@/lib/notify';

const MARCADOR = /\{\{mencao:([0-9a-fA-F-]{36})\}\}/g;

/** Marca quem deve ser mencionado. O envio troca pelo @ do telefone só no grupo. */
export function marcadorMencao(usuarioId: string): string {
  return `{{mencao:${usuarioId}}}`;
}

export type PessoaMencao = {
  id: string;
  nome: string;
  whatsapp: string | null;
};

/** No grupo, telefone vira @número. Fora dele, ou sem telefone, fica o nome. */
export function aplicarMencoes(
  texto: string,
  pessoas: readonly PessoaMencao[],
  grupo: boolean,
): { texto: string; mentions: string[] } {
  const porId = new Map(pessoas.map((pessoa) => [pessoa.id, pessoa]));
  const mentions: string[] = [];
  const resolvido = texto.replace(MARCADOR, (_trecho, id: string) => {
    const pessoa = porId.get(id);
    if (grupo && pessoa?.whatsapp) {
      mentions.push(pessoa.whatsapp);
      return `@${pessoa.whatsapp}`;
    }
    return pessoa?.nome ?? 'alguém';
  });
  return { texto: resolvido, mentions: [...new Set(mentions)] };
}

export function idsNoTexto(texto: string): string[] {
  return [...texto.matchAll(MARCADOR)].map((achado) => achado[1]!).filter(Boolean);
}

function destaque(titulo: string): string {
  return `*${titulo.replaceAll('*', '')}*`;
}

/** Primeira linha vira o título do cartão. O resto é a descrição, com uma linha em branco entre os blocos. */
function cartao(titulo: string, blocos: readonly string[]): string {
  const corpo = blocos.map((bloco) => bloco.trim()).filter(Boolean);
  return [titulo, '', ...corpo].join('\n\n');
}

export function textoEditorAtribuido(titulo: string, editorId: string): string {
  return cartao('Nova demanda', [
    destaque(titulo),
    `Atribuída a ${marcadorMencao(editorId)}.`,
  ]);
}

export function textoAjuste(titulo: string, editorId: string | null, motivo?: string): string {
  const editor = editorId ? `Editor\n${marcadorMencao(editorId)}` : '';
  const linhaMotivo = motivo?.trim() ? `Motivo\n${motivo.trim()}` : '';
  return cartao('Ajuste solicitado', [
    destaque(titulo),
    'Voltou para a edição.',
    [editor, linhaMotivo].filter(Boolean).join('\n\n'),
  ]);
}

export function textoAprovacao(titulo: string, influencerId: string | null): string {
  const influencer = influencerId ? `Influencer\n${marcadorMencao(influencerId)}` : '';
  return cartao('Demanda aprovada', [
    destaque(titulo),
    'Pode seguir para a postagem.',
    influencer,
  ]);
}

const LIMITE_LINHAS = 20;

function blocoResumo(titulo: string, linhas: readonly string[], total: number): string {
  if (total === 0) return '';
  const extra = total > linhas.length ? `E mais ${total - linhas.length}.` : '';
  return [titulo, ...linhas, extra].filter(Boolean).join('\n\n');
}

/** Um cartão por dia: atrasadas mencionam o editor; aprovação menciona o influencer. */
export function textoResumoDiario(itens: {
  atrasadas: readonly { titulo: string; prazo: string; editorId: string | null }[];
  aprovacao: readonly { titulo: string; influencerId: string | null }[];
}): string {
  const atrasadas = itens.atrasadas.slice(0, LIMITE_LINHAS).map((item) => {
    const quem = item.editorId ? marcadorMencao(item.editorId) : 'Sem editor';
    return `${destaque(item.titulo)}\n${item.prazo}\n${quem}`;
  });
  const aprovacao = itens.aprovacao.slice(0, LIMITE_LINHAS).map((item) => {
    const quem = item.influencerId ? marcadorMencao(item.influencerId) : 'Sem influencer';
    return `${destaque(item.titulo)}\n${quem}`;
  });
  return cartao('Pendências do dia', [
    blocoResumo('Atrasadas', atrasadas, itens.atrasadas.length),
    blocoResumo('Aguardando aprovação', aprovacao, itens.aprovacao.length),
  ]);
}

export function botaoDoAviso(
  aviso: { tipo: Notificacao['tipo']; demandaId?: string },
  appUrl: string,
): { rotulo: string; url: string } {
  const base = appUrl.replace(/\/$/, '') || 'http://localhost:3000';
  const demanda = aviso.demandaId ? `${base}/demandas/${aviso.demandaId}` : '';

  if (aviso.tipo === 'resumo_diario' || aviso.tipo === 'prazo_proximo') {
    return { rotulo: 'Abrir demandas', url: `${base}/demandas` };
  }
  if (aviso.tipo === 'pendencia_influencer') {
    return { rotulo: 'Abrir pendências', url: `${base}/pendencias` };
  }
  if (aviso.tipo === 'concluida_aprovada' && !demanda) {
    return { rotulo: 'Abrir agenda', url: `${base}/agenda` };
  }
  if (demanda) return { rotulo: 'Abrir demanda', url: demanda };
  return { rotulo: 'Abrir demandas', url: `${base}/demandas` };
}

/** Exemplares para revisar o texto no destino de teste, sem esperar um evento real. */
export function modelosEnsaio(): Notificacao[] {
  return [
    {
      tipo: 'resumo_diario',
      destinatarios: [],
      assunto: 'Ensaio: resumo do dia',
      texto: textoResumoDiario({
        atrasadas: [{ titulo: 'Pacote de ensaio', prazo: '11/11/2026', editorId: null }],
        aprovacao: [{ titulo: 'Pacote em aprovação', influencerId: null }],
      }),
    },
  ];
}
