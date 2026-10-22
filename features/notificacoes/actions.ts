'use server';

import { criarAcao } from '@/lib/action';
import { schemaPreferencias } from './schema';

/**
 * S1-08 (#11563 #11595): salva as preferências de notificação do usuário autenticado.
 * Não requer permissão além de ter sessão (o usuário edita apenas suas próprias preferências).
 */
export const salvarPreferencias = criarAcao({
  nome: 'salvarPreferencias',
  schema: schemaPreferencias,
  // Sem permissao: qualquer usuário autenticado (non-Premios) pode editar as próprias prefs.
  executar: async ({ tx, usuario, entrada }) => {
    await tx`
      INSERT INTO notification_preferences (
        user_id, editor_assigned, status_changed, new_comment,
        adjustment_request, completed_approved, deadline_near, updated_at
      ) VALUES (
        ${usuario.id},
        ${entrada.editor_atribuido},
        ${entrada.status_alterado},
        ${entrada.novo_comentario},
        ${entrada.ajuste_solicitado},
        ${entrada.concluida_aprovada},
        ${entrada.prazo_proximo},
        now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        editor_assigned    = EXCLUDED.editor_assigned,
        status_changed     = EXCLUDED.status_changed,
        new_comment        = EXCLUDED.new_comment,
        adjustment_request = EXCLUDED.adjustment_request,
        completed_approved = EXCLUDED.completed_approved,
        deadline_near      = EXCLUDED.deadline_near,
        updated_at         = now()
    `;

    return { dados: null, mensagem: 'Preferências salvas com sucesso.' };
  },
});
