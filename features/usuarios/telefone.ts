import { z } from 'zod';

export type WhatsappLido = { ok: true; numero: string | null } | { ok: false; numero: null };

const MENSAGEM = 'Informe o telefone com DDD. Ex.: 11999990000.';

/** Guarda só dígitos com DDI 55. Vazio é válido. "11999990000" vira "5511999990000". */
export function interpretarWhatsapp(valor: string | null | undefined): WhatsappLido {
  const bruto = (valor ?? '').trim();
  if (!bruto) return { ok: true, numero: null };
  let digitos = bruto.replace(/\D/g, '').replace(/^0+/, '');
  if (!digitos.startsWith('55')) digitos = `55${digitos}`;
  if (!/^55\d{10,11}$/.test(digitos)) return { ok: false, numero: null };
  return { ok: true, numero: digitos };
}

export const campoWhatsapp = z
  .union([z.string().max(30, 'Telefone muito longo.'), z.null()])
  .optional()
  .superRefine((valor, ctx) => {
    if (!interpretarWhatsapp(valor ?? null).ok) ctx.addIssue({ code: 'custom', message: MENSAGEM });
  })
  .transform((valor) => {
    const lido = interpretarWhatsapp(valor ?? null);
    return lido.ok ? lido.numero : null;
  });
