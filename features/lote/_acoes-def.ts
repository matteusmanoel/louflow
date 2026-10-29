import 'server-only';
import { z } from 'zod';
import type { DefinicaoAcao } from '@/lib/action';
import { processarLoteDesligamento as _processarLote } from './index';

// ---------------------------------------------------------------------------
// Re-exporta a função de domínio para que S1-01 possa chamar dentro de tx.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const schemaLoteDesligamento = z.object({
  usuarioIds: z
    .array(z.string().uuid({ message: 'ID de usuário inválido.' }))
    .min(1, { message: 'Informe pelo menos um Usuário.' }),
});

// ---------------------------------------------------------------------------
// Server Action — processamento em lote
// ---------------------------------------------------------------------------
export const defLoteDesligamento: DefinicaoAcao<
  typeof schemaLoteDesligamento,
  { processados: number; erros: string[] }
> = {
  nome: 'loteDesligamento',
  schema: schemaLoteDesligamento,
  permissao: 'gerenciarUsuarios',
  executar: async ({ usuario, entrada }) => {
    // Cada usuário é desligado em transação própria; erros não abortam o lote.
    const resultado = await _processarLote(entrada.usuarioIds, usuario.id);

    const mensagem =
      resultado.erros.length === 0
        ? `${resultado.processados} usuário(s) desligado(s) com sucesso.`
        : `${resultado.processados} desligado(s); ${resultado.erros.length} com erro.`;

    return { dados: resultado, mensagem };
  },
};

