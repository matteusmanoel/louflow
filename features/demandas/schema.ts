import { z } from 'zod';

export const STATUSES_FINAIS = ['Concluída', 'Cancelada', 'Reprovada'] as const;
export const STATUS_APROVACAO = 'Aprovação' as const;
export const STATUSES_NAO_ATRASADOS = [...STATUSES_FINAIS, STATUS_APROVACAO] as const;

export const schemaCriarDemanda = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(300),
  format: z.string().trim().min(1, 'Informe o formato.'),
  influencer_id: z.string().uuid().nullable().optional(),
  editor_id: z.string().uuid().nullable().optional(),
  priority: z.enum(['Baixa', 'Normal', 'Alta', 'Urgente']).default('Normal'),
  approval_date: z.string().nullable().optional(),
  post_date: z.string().nullable().optional(),
  info: z.string().max(2000).nullable().optional(),
  link: z
    .string()
    .url('Link inválido.')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  editorial_line: z.enum(['Viral', 'Comunidade', 'Educacional']).nullable().optional(),
  source_program: z.string().max(200).nullable().optional(),
  clips_count: z.number().int().min(1).max(999).nullable().optional(),
});

export const schemaEditarDemanda = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'Informe o título.').max(300),
  format: z.string().trim().min(1, 'Informe o formato.'),
  influencer_id: z.string().uuid().nullable().optional(),
  editor_id: z.string().uuid().nullable().optional(),
  priority: z.enum(['Baixa', 'Normal', 'Alta', 'Urgente']).default('Normal'),
  approval_date: z.string().nullable().optional(),
  post_date: z.string().nullable().optional(),
  info: z.string().max(2000).nullable().optional(),
  link: z
    .string()
    .url('Link inválido.')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  editorial_line: z.enum(['Viral', 'Comunidade', 'Educacional']).nullable().optional(),
  source_program: z.string().max(200).nullable().optional(),
  clips_count: z.number().int().min(1).max(999).nullable().optional(),
});

export const schemaExcluirDemanda = z.object({
  id: z.string().min(1),
});

export const schemaAssumirFicha = z.object({
  demandaId: z.string().min(1),
});

export const schemaAlterarPrioridade = z.object({
  id: z.string().min(1),
  priority: z.enum(['Baixa', 'Normal', 'Alta', 'Urgente']),
});

export type EntradaCriarDemanda = z.infer<typeof schemaCriarDemanda>;
export type EntradaEditarDemanda = z.infer<typeof schemaEditarDemanda>;
export type EntradaExcluirDemanda = z.infer<typeof schemaExcluirDemanda>;
export type EntradaAssumirFicha = z.infer<typeof schemaAssumirFicha>;
export type EntradaAlterarPrioridade = z.infer<typeof schemaAlterarPrioridade>;
