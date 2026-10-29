import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { registrarAuditoria } from '@/lib/audit';
import { novoId } from '@/lib/crypto';
import { ErroDominio } from '@/lib/errors';
import { schemaCadastrarSorteio, schemaRegistrarRetirada } from './schema';

export const defCadastrarSorteio: DefinicaoAcao<typeof schemaCadastrarSorteio, { id: string }> = {
  nome: 'cadastrarSorteio',
  schema: schemaCadastrarSorteio,
  permissao: 'verSorteios',
  executar: async ({ tx, usuario, entrada }) => {
    const id = novoId('SR');
    const prazo = entrada.prazoRetirada === '' ? null : entrada.prazoRetirada;
    const retiradaEm = entrada.retirou ? new Date() : null;
    await tx`
      INSERT INTO raffles (
        id, winner_name, month, campaign, prize, retrieved, retrieval_deadline,
        notes, created_by, retrieved_by, retrieved_at, origin
      ) VALUES (
        ${id}, ${entrada.ganhador}, ${entrada.mes}, ${entrada.campanha}, ${entrada.premio},
        ${entrada.retirou}, ${prazo}, ${entrada.observacoes === '' ? null : entrada.observacoes},
        ${usuario.id},
        ${entrada.retirou ? usuario.id : null},
        ${retiradaEm},
        'LouFlow'
      )
    `;
    await registrarAuditoria(tx, {
      acao: 'cadastrar_sorteio',
      usuarioId: usuario.id,
      alvo: id,
      detalhes: entrada.premio,
      depois: { mes: entrada.mes, premio: entrada.premio, retirou: entrada.retirou },
    });
    return { dados: { id }, mensagem: 'Prêmio cadastrado.' };
  },
};

export const defRegistrarRetirada: DefinicaoAcao<typeof schemaRegistrarRetirada, { id: string }> = {
  nome: 'registrarRetiradaSorteio',
  schema: schemaRegistrarRetirada,
  permissao: 'verSorteios',
  executar: async ({ tx, usuario, entrada }) => {
    const [atual] = await tx<{ retrieved: boolean }[]>`
      SELECT retrieved FROM raffles WHERE id = ${entrada.id} FOR UPDATE
    `;
    if (!atual) throw new ErroDominio('Registro não encontrado.');
    if (atual.retrieved) throw new ErroDominio('A retirada já está registrada.');
    await tx`
      UPDATE raffles
         SET retrieved = true,
             retrieved_by = ${usuario.id},
             retrieved_at = now()
       WHERE id = ${entrada.id}
    `;
    await registrarAuditoria(tx, {
      acao: 'registrar_retirada_sorteio',
      usuarioId: usuario.id,
      alvo: entrada.id,
      antes: { retirou: false },
      depois: { retirou: true },
    });
    return { dados: { id: entrada.id }, mensagem: 'Retirada registrada.' };
  },
};
