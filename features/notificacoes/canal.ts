import { ErroDominio } from '@/lib/errors';

export type CanalWhatsapp = {
  base: string;
  token: string;
  destino: string;
  grupoLiberado: boolean;
  destinoEhGrupo: boolean;
  pronto: boolean;
};

export function lerCanal(ambiente: NodeJS.ProcessEnv = process.env): CanalWhatsapp {
  const base = (ambiente.UAZAPI_BASE_URL ?? '').trim().replace(/\/$/, '');
  const token = (ambiente.UAZAPI_TOKEN ?? '').trim();
  const destino = (ambiente.UAZAPI_DESTINO ?? '').trim();
  const destinoEhGrupo = destino.endsWith('@g.us');
  return {
    base,
    token,
    destino,
    grupoLiberado: ambiente.UAZAPI_GRUPO_LIBERADO === 'true',
    destinoEhGrupo,
    pronto: Boolean(base && token && destino),
  };
}

/** Recusa o grupo sem a liberação de produção e exige o canal antes de um ensaio. */
export function garantirCanalParaEnvio(ambiente: NodeJS.ProcessEnv = process.env): CanalWhatsapp {
  const canal = lerCanal(ambiente);
  if (canal.destinoEhGrupo && !canal.grupoLiberado) {
    throw new ErroDominio('O destino é um grupo. A liberação de produção ainda está desligada.');
  }
  if (!canal.pronto) {
    throw new ErroDominio('O WhatsApp ainda não está configurado neste ambiente.');
  }
  return canal;
}
