import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { novoId } from '@/lib/crypto';
import {
  schemaRegistrarUsoDrone,
  schemaEditarUsoDrone,
  schemaCancelarUsoDrone,
} from './schema';

const VALOR_CENTAVOS = 25000; // R$ 250,00 fixo

/** Normaliza campos para a chave de deduplicação. */
function gerarDedupeKey(used_on: string, responsible: string, served_profile: string, reason: string, location: string): string {
  return [
    used_on.trim(),
    responsible.trim().toLowerCase(),
    served_profile.trim().toLowerCase(),
    reason.trim().toLowerCase(),
    location.trim().toLowerCase(),
  ].join('|');
}

/** Rejeita data futura no domínio (invariante: não usamos CHECK no banco pois now() não é imutável). */
function verificarDataNaoFutura(used_on: string): void {
  const hoje = new Date().toISOString().slice(0, 10); // AAAA-MM-DD em UTC
  if (used_on > hoje) {
    throw new ErroDominio('A data do uso não pode ser futura.');
  }
}

// ---------------------------------------------------------------------------
// Definições exportadas para os testes (executarAcao com injeção de dependência)
// ---------------------------------------------------------------------------

export const defRegistrarUsoDrone: DefinicaoAcao<typeof schemaRegistrarUsoDrone, { id: string }> = {
  nome: 'registrarUsoDrone',
  schema: schemaRegistrarUsoDrone,
  permissao: 'operarDrone',
  restricoes: {
    drone_usages_dedupe_uq: 'Já existe um registro ativo idêntico para esse responsável e data.',
  },
  executar: async ({ tx, usuario, entrada }) => {
    const { used_on, responsible, served_profile, reason, location } = entrada;

    verificarDataNaoFutura(used_on);

    const id = novoId('DR');
    const dedupe_key = gerarDedupeKey(used_on, responsible, served_profile, reason, location);

    await tx`
      INSERT INTO drone_usages
        (id, used_on, responsible, served_profile, reason, location, amount_cents, dedupe_key, created_by)
      VALUES
        (${id}, ${used_on}, ${responsible.trim()}, ${served_profile.trim()},
         ${reason.trim()}, ${location.trim()}, ${VALOR_CENTAVOS}, ${dedupe_key}, ${usuario.id})
    `;

    return { dados: { id }, mensagem: 'Uso de drone registrado com sucesso.' };
  },
};

export const defEditarUsoDrone: DefinicaoAcao<typeof schemaEditarUsoDrone, { id: string }> = {
  nome: 'editarUsoDrone',
  schema: schemaEditarUsoDrone,
  permissao: 'operarDrone',
  restricoes: {
    drone_usages_dedupe_uq: 'Já existe um registro ativo idêntico para esse responsável e data.',
  },
  executar: async ({ tx, usuario, entrada }) => {
    const { id, versao, used_on, responsible, served_profile, reason, location } = entrada;

    verificarDataNaoFutura(used_on);

    // Concorrência otimista: lê o registro com FOR UPDATE e compara updated_at
    const [registro] = await tx<{ updated_at: Date; status: string }[]>`
      SELECT updated_at, status FROM drone_usages WHERE id = ${id} FOR UPDATE
    `;

    if (!registro) throw new ErroDominio('Registro não encontrado.');
    if (registro.status === 'Cancelado') throw new ErroDominio('Registros cancelados não podem ser editados.');

    if (registro.updated_at.toISOString() !== versao) {
      throw new ErroDominio('O registro foi alterado por outro usuário. Recarregue a página e tente novamente.');
    }

    const dedupe_key = gerarDedupeKey(used_on, responsible, served_profile, reason, location);

    await tx`
      UPDATE drone_usages SET
        used_on       = ${used_on},
        responsible   = ${responsible.trim()},
        served_profile = ${served_profile.trim()},
        reason        = ${reason.trim()},
        location      = ${location.trim()},
        dedupe_key    = ${dedupe_key},
        updated_by    = ${usuario.id},
        updated_at    = now()
      WHERE id = ${id}
    `;

    return { dados: { id }, mensagem: 'Uso de drone atualizado com sucesso.' };
  },
};

export const defCancelarUsoDrone: DefinicaoAcao<typeof schemaCancelarUsoDrone, { id: string }> = {
  nome: 'cancelarUsoDrone',
  schema: schemaCancelarUsoDrone,
  permissao: 'operarDrone',
  executar: async ({ tx, usuario, entrada }) => {
    const { id } = entrada;

    const [registro] = await tx<{ status: string }[]>`
      SELECT status FROM drone_usages WHERE id = ${id} FOR UPDATE
    `;

    if (!registro) throw new ErroDominio('Registro não encontrado.');
    if (registro.status === 'Cancelado') throw new ErroDominio('Este registro já está cancelado.');

    await tx`
      UPDATE drone_usages SET
        status     = 'Cancelado',
        updated_by = ${usuario.id},
        updated_at = now()
      WHERE id = ${id}
    `;

    return { dados: { id }, mensagem: 'Uso de drone cancelado.' };
  },
};

// ---------------------------------------------------------------------------
// Server Actions públicas (usadas pelos componentes React)
// ---------------------------------------------------------------------------

