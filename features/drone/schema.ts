import { z } from 'zod';

const campoData = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.');

export const schemaRegistrarUsoDrone = z.object({
  used_on: campoData,
  responsible: z.string().trim().min(1, 'Informe o responsável.').max(200),
  served_profile: z.string().trim().min(1, 'Informe o perfil atendido.').max(200),
  reason: z.string().trim().min(1, 'Informe o motivo.').max(500),
  location: z.string().trim().min(1, 'Informe o local.').max(200),
});

export type EntradaRegistrarUsoDrone = z.infer<typeof schemaRegistrarUsoDrone>;

export const schemaEditarUsoDrone = schemaRegistrarUsoDrone.extend({
  id: z.string().min(1, 'ID obrigatório.'),
  versao: z.string().min(1, 'Versão do registro é obrigatória.'),
});

export type EntradaEditarUsoDrone = z.infer<typeof schemaEditarUsoDrone>;

export const schemaCancelarUsoDrone = z.object({
  id: z.string().min(1, 'ID obrigatório.'),
});

export type EntradaCancelarUsoDrone = z.infer<typeof schemaCancelarUsoDrone>;

/** Perfis atendidos admitidos na interface. */
export const PERFIS_ATENDIDOS = ['Administrador', 'Editor', 'Influencer', 'Prêmios'] as const;
export type PerfilAtendido = (typeof PERFIS_ATENDIDOS)[number];
