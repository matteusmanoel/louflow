import 'server-only';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import { registrarAuditoria } from '@/lib/audit';
import type { DefinicaoAcao } from '@/lib/action';
import { schemaRestaurarDemanda, schemaExcluirDefinitivamente } from './schema';

export const defRestaurarDemanda: DefinicaoAcao<typeof schemaRestaurarDemanda, { id: string }> = {
  nome: 'restaurarDemanda',
  schema: schemaRestaurarDemanda,
  permissao: (u) => u.permissoes.gerenciarUsuarios || u.permissoes.verTodasDemandas,
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{ id: string; title: string; deleted_at: Date | null }[]>`
      SELECT id, title, deleted_at FROM demands WHERE id = ${entrada.demandaId} FOR UPDATE
    `;
    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (!demanda.deleted_at) throw new ErroDominio('Esta demanda não está na lixeira.');

    await tx`
      UPDATE demands SET deleted_at = NULL, updated_at = now() WHERE id = ${entrada.demandaId}
    `;
    await tx`
      DELETE FROM demand_trash WHERE demand_id = ${entrada.demandaId}
    `;

    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'Restaurada da lixeira',
      usuarioId: usuario.id,
    });

    await registrarAuditoria(tx, {
      acao: 'restaurar_demanda',
      usuarioId: usuario.id,
      alvo: entrada.demandaId,
      detalhes: `Demanda "${demanda.title}" restaurada da lixeira`,
    });

    return { dados: { id: entrada.demandaId }, mensagem: 'Demanda restaurada com sucesso.' };
  },
};

export const defExcluirDefinitivamente: DefinicaoAcao<typeof schemaExcluirDefinitivamente, { id: string }> = {
  nome: 'excluirDefinitivamente',
  schema: schemaExcluirDefinitivamente,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{ id: string; title: string; deleted_at: Date | null }[]>`
      SELECT id, title, deleted_at FROM demands WHERE id = ${entrada.demandaId} FOR UPDATE
    `;
    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (!demanda.deleted_at) throw new ErroDominio('Esta demanda não está na lixeira. Envie-a para a lixeira antes de excluir definitivamente.');

    await registrarAuditoria(tx, {
      acao: 'excluir_definitivamente',
      usuarioId: usuario.id,
      alvo: entrada.demandaId,
      detalhes: `Demanda "${demanda.title}" excluída definitivamente`,
      antes: { id: demanda.id, title: demanda.title },
    });

    await tx`
      DELETE FROM demands WHERE id = ${entrada.demandaId}
    `;

    return { dados: { id: entrada.demandaId }, mensagem: 'Demanda excluída definitivamente.' };
  },
};
