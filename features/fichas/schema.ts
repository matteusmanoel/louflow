import { z } from 'zod';

export const schemaSalvarFichaTecnica = z.object({
  demandaId: z.string().min(1, 'ID da Demanda obrigatório.'),
  formato: z.string().min(1, 'Formato obrigatório.').max(100),
  duracaoSegundos: z
    .number()
    .int('Duração deve ser inteiro.')
    .positive('Duração deve ser positiva.'),
  plataformas: z
    .array(z.string().min(1))
    .min(1, 'Informe ao menos uma plataforma.'),
  briefing: z.string().min(1, 'Briefing obrigatório.').max(5000),
  observacoesTecnicas: z.string().max(2000).optional(),
});

export type EntradaSalvarFichaTecnica = z.infer<typeof schemaSalvarFichaTecnica>;

const textoLongo = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres.`)
    .optional()
    .transform((valor) => (valor ? valor : undefined));

const dataCivil = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
  .refine((valor) => {
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano!, mes! - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes! - 1 && data.getUTCDate() === dia;
  }, 'Data inválida.')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * Envio da Ficha Técnica pelo Influencer (PRD §4.5). Não há campo de Influencer nem de Editor da
 * Demanda: o Influencer é sempre a Sessão (o zod descarta chaves desconhecidas) e a Demanda nasce
 * sem Editor, na Fila de Fichas. `editorSugeridoId` é só sugestão gravada na ficha.
 */
export const schemaEnviarFicha = z.object({
  /** Chave de idempotência gerada pelo formulário: reenviar não cria outra Demanda. */
  chaveEnvio: z.string().uuid('Chave de envio inválida.').optional(),
  identificacao: z.string().trim().min(1, 'Informe a identificação.').max(300, 'Use até 300 caracteres.'),
  observacaoEditor: textoLongo(2000),
  previsaoPublicacao: dataCivil,
  roteiro: textoLongo(),
  cabeca: textoLongo(),
  sonora: textoLongo(),
  informacoes: textoLongo(),
  linkArquivos: z
    .string()
    .trim()
    .url('Link inválido.')
    .refine((valor) => /^https?:\/\//i.test(valor), 'Use um link http ou https.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  roteiroEscrito: textoLongo(),
  gcLettering: textoLongo(2000),
  materialSsd: textoLongo(2000),
  plataforma: textoLongo(100),
  formatoConteudo: textoLongo(100),
  referenciasVisuais: textoLongo(),
  editorSugeridoId: z.string().uuid('Editor sugerido inválido.').optional().or(z.literal('').transform(() => undefined)),
});

export type EntradaEnviarFicha = z.infer<typeof schemaEnviarFicha>;
