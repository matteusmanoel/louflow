import { z } from 'zod';

function diaValido(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export const schemaCadastrarSorteio = z.object({
  ganhador: z
    .string()
    .trim()
    .min(1, 'Informe o nome do ganhador.')
    .max(120, 'O nome do ganhador deve ter no máximo 120 caracteres.'),
  mes: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.'),
  campanha: z.string().trim().max(120, 'A campanha deve ter no máximo 120 caracteres.'),
  premio: z.string().trim().min(1, 'Informe o prêmio.').max(200, 'O prêmio deve ter no máximo 200 caracteres.'),
  prazoRetirada: z
    .string()
    .trim()
    .refine((valor) => valor === '' || diaValido(valor), 'Prazo de retirada inválido.'),
  observacoes: z.string().trim().max(1000, 'Observações devem ter no máximo 1000 caracteres.'),
  retirou: z.boolean(),
});

export const schemaRegistrarRetirada = z.object({
  id: z.string().trim().min(1, 'Registro não encontrado.'),
});

export const schemaBuscaSorteios = z.object({
  termo: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.'),
  ano: z
    .string()
    .trim()
    .refine((valor) => valor === '' || /^\d{4}$/.test(valor), 'Ano inválido.'),
});
