import type { Db } from '@/lib/db';
import { formatarData } from '@/lib/datas';
import {
  listarDemandasAtrasadas,
  produtividadePorEditor,
  resumoDoDia,
  tempoMedioEdicao,
} from '@/features/metricas/consultas';
import { formatarDuracao } from '@/features/ranking/duracao';
import { interpretar } from './interpretar';

export const TEXTO_SUPORTADO =
  'Posso responder sobre demandas concluídas no período, demandas atrasadas, tempo médio de edição e o resumo de um dia.';

function acharEditor(usuarios: { id: string; name: string }[], pergunta: string) {
  const frase = pergunta.toLocaleLowerCase('pt-BR');
  const achados = usuarios.filter((u) => frase.includes(u.name.toLocaleLowerCase('pt-BR')));
  achados.sort((a, b) => b.name.length - a.name.length);
  return achados[0] ?? null;
}

function mencionaEditor(pergunta: string): boolean {
  return /editor\s+\p{L}/iu.test(pergunta);
}

export async function responder(sql: Db, pergunta: string, agora = new Date()): Promise<string> {
  const intencao = interpretar(pergunta, agora);
  if (intencao.tipo === 'nao-suportada') return TEXTO_SUPORTADO;

  const usuarios = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM users WHERE is_active = true`;
  const editor = acharEditor(usuarios, pergunta);
  if (mencionaEditor(pergunta) && !editor) return 'Não encontrei esse editor no LouFlow.';

  if (intencao.tipo === 'atrasadas') {
    const lista = await listarDemandasAtrasadas(editor?.id, sql);
    if (lista.length === 0) return 'Não há demandas atrasadas.';
    const linhas = lista.map((d) => `${d.titulo} (prazo ${formatarData(d.prazo)})`);
    return `Demandas atrasadas: ${linhas.join('; ')}.`;
  }

  if (intencao.tipo === 'resumo') {
    const resumo = await resumoDoDia(intencao.dia, sql);
    return `Em ${formatarData(resumo.dia)} entraram ${resumo.entraram}, mudaram de status ${resumo.mudaramStatus}, concluíram ${resumo.concluidas} e ${resumo.atrasadas} estavam atrasadas.`;
  }

  if (intencao.tipo === 'tempo') {
    const media = await tempoMedioEdicao(intencao.periodo, editor?.id, sql);
    const deQuem = editor ? ` de ${editor.name}` : '';
    if (media == null) return `Não há ciclos concluídos${deQuem} nesse período.`;
    return `O tempo médio de edição${deQuem} no período é ${formatarDuracao(media)}.`;
  }

  const linhas = await produtividadePorEditor(intencao.periodo, sql);
  const escolhidas = editor ? linhas.filter((l) => l.editorId === editor.id) : linhas;
  if (escolhidas.length === 0 || escolhidas.every((l) => l.concluidas === 0)) {
    return 'Nenhuma demanda concluída no período.';
  }
  return escolhidas
    .map(
      (l) =>
        `${l.nome} concluiu ${l.concluidas} demandas entre ${formatarData(intencao.periodo.inicio)} e ${formatarData(intencao.periodo.fim)}.`,
    )
    .join(' ');
}
