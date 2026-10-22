import { z } from 'zod';
import { CHAVES_PERMISSAO, PERFIS } from '@/lib/permissions';

export const schemaCriarUsuario = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.').max(100, 'Nome muito longo.'),
  email: z.string().email('E-mail inválido.').toLowerCase(),
  perfil: z.enum(PERFIS),
  editorLabel: z.string().max(50, 'Rótulo de editor muito longo.').nullish(),
});

export const schemaEditarUsuario = z.object({
  usuarioId: z.string().uuid('ID inválido.'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.').max(100, 'Nome muito longo.'),
  email: z.string().email('E-mail inválido.').toLowerCase(),
  perfil: z.enum(PERFIS),
  editorLabel: z.string().max(50, 'Rótulo de editor muito longo.').nullish(),
});

export const schemaAlterarAtivacao = z.object({
  usuarioId: z.string().uuid('ID inválido.'),
});

export const schemaConcederPermissao = z.object({
  usuarioId: z.string().uuid('ID inválido.'),
  chave: z.enum(CHAVES_PERMISSAO),
  concedida: z.boolean(),
});

export const schemaGerenciarDelegados = z.object({
  aprovadorId: z.string().uuid('ID inválido.'),
  editorId: z.string().uuid('ID inválido.'),
  adicionar: z.boolean(),
});

export const schemaRedefinirPin = z.object({
  usuarioId: z.string().uuid('ID inválido.'),
});

export type EntradaCriarUsuario = z.infer<typeof schemaCriarUsuario>;
export type EntradaEditarUsuario = z.infer<typeof schemaEditarUsuario>;
export type EntradaAlterarAtivacao = z.infer<typeof schemaAlterarAtivacao>;
export type EntradaConcederPermissao = z.infer<typeof schemaConcederPermissao>;
export type EntradaGerenciarDelegados = z.infer<typeof schemaGerenciarDelegados>;
export type EntradaRedefinirPin = z.infer<typeof schemaRedefinirPin>;
