import { z } from 'zod';

/** Schema para salvar preferências de notificação do usuário autenticado. */
export const schemaPreferencias = z.object({
  editor_atribuido: z.boolean(),
  status_alterado: z.boolean(),
  novo_comentario: z.boolean(),
  ajuste_solicitado: z.boolean(),
  concluida_aprovada: z.boolean(),
  prazo_proximo: z.boolean(),
});

export type EntradaPreferencias = z.infer<typeof schemaPreferencias>;
