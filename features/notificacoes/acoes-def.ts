import 'server-only';
import { z } from 'zod';
import type { DefinicaoAcao } from '@/lib/action';
import type { Db } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import { garantirCanalParaEnvio } from './canal';
import { enviarNotificacao } from './enviador';
import { modelosEnsaio } from './mensagens';
import { schemaCadencia, type EntradaCadencia } from './schema';

export const schemaEnsaio = z.object({}).optional();

export const defSalvarCadencia: DefinicaoAcao<typeof schemaCadencia, null> = {
  nome: 'salvarCadencia',
  schema: schemaCadencia,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx, usuario, entrada }) => {
    await gravarCadencia(tx, usuario.id, entrada);
    return { dados: null, mensagem: 'Cadência dos avisos salva.' };
  },
};

export const defEnviarEnsaio: DefinicaoAcao<typeof schemaEnsaio, null> = {
  nome: 'enviarEnsaio',
  schema: schemaEnsaio,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx }) => {
    garantirCanalParaEnvio();
    try {
      for (const modelo of modelosEnsaio()) await enviarNotificacao(tx, modelo);
    } catch (erro) {
      if (erro instanceof ErroDominio) throw erro;
      throw new ErroDominio('Não foi possível enviar o ensaio.');
    }
    return { dados: null, mensagem: 'Ensaio enviado para o destino configurado.' };
  },
};

async function gravarCadencia(tx: Db, usuarioId: string, entrada: EntradaCadencia): Promise<void> {
  await tx`
    INSERT INTO notification_settings (
      id, deadline_hour, deadline_lead_days, pending_hour, pending_grace_hours, updated_at, updated_by
    ) VALUES (
      true,
      ${entrada.horaPrazo},
      ${entrada.antecedenciaDias},
      ${entrada.horaPendencia},
      ${entrada.folgaHoras},
      now(),
      ${usuarioId}
    )
    ON CONFLICT (id) DO UPDATE SET
      deadline_hour       = EXCLUDED.deadline_hour,
      deadline_lead_days  = EXCLUDED.deadline_lead_days,
      pending_hour        = EXCLUDED.pending_hour,
      pending_grace_hours = EXCLUDED.pending_grace_hours,
      updated_at          = now(),
      updated_by          = EXCLUDED.updated_by
  `;
}
