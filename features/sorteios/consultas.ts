import 'server-only';
import { db } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import type { UsuarioSessao } from '@/lib/session';
import { schemaBuscaSorteios } from './schema';

export type Sorteio = {
  id: string;
  ganhador: string;
  mes: string;
  campanha: string;
  premio: string;
  retirou: boolean;
  prazoRetirada: string | null;
  observacoes: string;
  cadastradoEm: Date;
  retiradaEm: Date | null;
  origem: string;
};

export type ListaSorteios = {
  total: number;
  anos: string[];
  registros: Sorteio[];
};

export async function listarSorteios(
  usuario: UsuarioSessao,
  termo = '',
  ano = '',
): Promise<ListaSorteios> {
  if (!usuario.permissoes.verSorteios) {
    throw new ErroDominio('Você não possui permissão para acessar Sorteios e prêmios.');
  }
  const validado = schemaBuscaSorteios.safeParse({ termo, ano });
  if (!validado.success) {
    throw new ErroDominio(validado.error.issues[0]?.message ?? 'Busca inválida.');
  }
  const busca = validado.data;
  const filtro = `%${busca.termo}%`;
  const anoSql = busca.ano === '' ? null : busca.ano;

  const [contagem] = await db()<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
      FROM raffles
     WHERE (${anoSql}::text IS NULL OR left(month, 4) = ${anoSql})
       AND (
         ${busca.termo} = ''
         OR winner_name ILIKE ${filtro}
         OR month ILIKE ${filtro}
         OR campaign ILIKE ${filtro}
         OR prize ILIKE ${filtro}
       )
  `;

  const registros = await db()<{
    id: string;
    winner_name: string;
    month: string;
    campaign: string;
    prize: string;
    retrieved: boolean;
    retrieval_deadline: string | null;
    notes: string | null;
    created_at: Date;
    retrieved_at: Date | null;
    origin: string;
  }[]>`
    SELECT id, winner_name, month, campaign, prize, retrieved,
           retrieval_deadline::text AS retrieval_deadline,
           notes, created_at, retrieved_at, origin
      FROM raffles
     WHERE (${anoSql}::text IS NULL OR left(month, 4) = ${anoSql})
       AND (
         ${busca.termo} = ''
         OR winner_name ILIKE ${filtro}
         OR month ILIKE ${filtro}
         OR campaign ILIKE ${filtro}
         OR prize ILIKE ${filtro}
       )
     ORDER BY created_at DESC
     LIMIT 100
  `;

  const anos = await db()<{ ano: string }[]>`
    SELECT DISTINCT left(month, 4) AS ano
      FROM raffles
     WHERE month ~ '^[0-9]{4}-'
     ORDER BY ano DESC
  `;

  return {
    total: Number(contagem?.total ?? 0),
    anos: anos.map((linha) => linha.ano),
    registros: registros.map((linha) => ({
      id: linha.id,
      ganhador: linha.winner_name,
      mes: linha.month,
      campanha: linha.campaign,
      premio: linha.prize,
      retirou: linha.retrieved,
      prazoRetirada: linha.retrieval_deadline,
      observacoes: linha.notes ?? '',
      cadastradoEm: linha.created_at,
      retiradaEm: linha.retrieved_at,
      origem: linha.origin,
    })),
  };
}
