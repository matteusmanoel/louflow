import type { Enviador, Notificacao } from '@/lib/notify';
import type { Db } from '@/lib/db';
import { aplicarMencoes, botaoDoAviso, idsNoTexto, type PessoaMencao } from './mensagens';
import { lerCanal } from './canal';

/**
 * Adaptador de avisos do setor. O destino é o canal configurado (conversa de teste
 * ou, com liberação, o grupo). Sem credencial, registra e não envia.
 * Falhas lançadas aqui são capturadas por lib/notify e não desfazem a operação.
 */

const RODAPE = 'Loumar Turismo';

async function pessoas(sql: Db, ids: string[]): Promise<PessoaMencao[]> {
  if (ids.length === 0) return [];
  const unicos = [...new Set(ids)];
  const linhas = await sql<{ id: string; name: string; whatsapp: string | null }[]>`
    SELECT id, name, whatsapp
    FROM   users
    WHERE  id = ANY(${sql.array(unicos)}::uuid[])
  `;
  return linhas.map((linha) => ({ id: linha.id, nome: linha.name, whatsapp: linha.whatsapp }));
}

function registrarSemEnvio(aviso: Notificacao): void {
  console.log('[notificacao]', {
    tipo: aviso.tipo,
    assunto: aviso.assunto,
    demandaId: aviso.demandaId,
    semEnvio: true,
  });
}

export const enviarNotificacao: Enviador = async (sql, aviso) => {
  const canal = lerCanal();
  if (canal.destinoEhGrupo && !canal.grupoLiberado) {
    throw new Error('O destino configurado é um grupo e o envio para grupo ainda não está liberado.');
  }
  if (!canal.pronto) {
    registrarSemEnvio(aviso);
    return;
  }

  const ids = [...new Set([...aviso.destinatarios, ...idsNoTexto(aviso.texto)])];
  const { texto, mentions } = aplicarMencoes(aviso.texto, await pessoas(sql, ids), canal.destinoEhGrupo);
  const botao = botaoDoAviso(aviso, process.env.APP_URL ?? '');
  const corpo: Record<string, unknown> = {
    number: canal.destino,
    type: 'button',
    text: texto,
    footerText: RODAPE,
    choices: [`${botao.rotulo}|${botao.url}`],
    delay: 0,
    readchat: true,
  };
  if (canal.destinoEhGrupo && mentions.length > 0) corpo.mentions = mentions.join(',');

  const resposta = await fetch(`${canal.base}/send/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      token: canal.token,
    },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    throw new Error(`uazapi respondeu ${resposta.status}`);
  }
};
