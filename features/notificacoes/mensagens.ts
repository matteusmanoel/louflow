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

export function textoPrazo(
  dias: number,
  itens: readonly { titulo: string; prazo: string; editorId: string | null }[],
): string {
  const visiveis = itens.slice(0, 20);
  const linhas = visiveis.map((item) => {
    const quem = item.editorId ? `\n${marcadorMencao(item.editorId)}` : '';
    return `${destaque(item.titulo)}\n${item.prazo}${quem}`;
  });
  const extra = itens.length > visiveis.length ? `E mais ${itens.length - visiveis.length}.` : '';
  return cartao('Prazos próximos', [`Nos próximos ${dias} dias.`, linhas.join('\n\n'), extra]);
}

export function textoPendencia(
  horas: number,
  itens: readonly { titulo: string; influencerId: string | null }[],
): string {
  const visiveis = itens.slice(0, 20);
  const linhas = visiveis.map((item) => {
    const quem = item.influencerId ? `\n${marcadorMencao(item.influencerId)}` : '';
    return `${destaque(item.titulo)}${quem}`;
  });
  const extra = itens.length > visiveis.length ? `E mais ${itens.length - visiveis.length}.` : '';
  return cartao('Pendência em aberto', [`Há mais de ${horas} h sem resposta.`, linhas.join('\n\n'), extra]);
}

export function botaoDoAviso(
  aviso: { tipo: Notificacao['tipo']; demandaId?: string },
  appUrl: string,
): { rotulo: string; url: string } {
  const base = appUrl.replace(/\/$/, '') || 'http://localhost:3000';
  const demanda = aviso.demandaId ? `${base}/demandas/${aviso.demandaId}` : '';

  if (aviso.tipo === 'pendencia_influencer') {
    return { rotulo: 'Abrir pendências', url: `${base}/pendencias` };
  }
  if (aviso.tipo === 'prazo_proximo') {
    return { rotulo: 'Abrir demandas', url: `${base}/demandas` };
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
      tipo: 'editor_atribuido',
      destinatarios: [],
      assunto: 'Ensaio: editor atribuído',
      texto: cartao('Nova demanda', [destaque('Pacote de ensaio'), 'Atribuída a Editor de ensaio.']),
    },
    {
      tipo: 'ajuste_solicitado',
      destinatarios: [],
      assunto: 'Ensaio: ajuste',
      texto: cartao('Ajuste solicitado', [
        destaque('Pacote de ensaio'),
        'Voltou para a edição.',
        'Editor\nEditor de ensaio',
        'Motivo\nTexto de ensaio.',
      ]),
    },
    {
      tipo: 'concluida_aprovada',
      destinatarios: [],
      assunto: 'Ensaio: aprovação',
      texto: cartao('Demanda aprovada', [
        destaque('Pacote de ensaio'),
        'Pode seguir para a postagem.',
        'Influencer\nInfluencer de ensaio',
      ]),
    },
    {
      tipo: 'prazo_proximo',
      destinatarios: [],
      assunto: 'Ensaio: prazo',
      texto: cartao('Prazos próximos', [
        'Nos próximos 2 dias.',
        `${destaque('Pacote de ensaio')}\n11/11/2026\nEditor de ensaio`,
      ]),
    },
    {
      tipo: 'pendencia_influencer',
      destinatarios: [],
      assunto: 'Ensaio: pendência',
      texto: cartao('Pendência em aberto', [
        'Há mais de 24 h sem resposta.',
        `${destaque('Pacote de ensaio')}\nInfluencer de ensaio`,
      ]),
    },
  ];
}
