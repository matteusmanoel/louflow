import type { UsuarioSessao } from '@/lib/session';

/** Contrato fixo das seções reservadas do detalhe da Demanda (ver AGENTS.md). */
export type PropsSecaoDemanda = {
  demandaId: string;
  usuario: UsuarioSessao;
};

export { FichaSecao } from '@/features/fichas/components/FichaSecao';
export { StatusControle } from '@/features/status/components/StatusControle';
export { EntregasSecao } from '@/features/aprovacoes/components/EntregasSecao';
export { ComentariosSecao } from '@/features/comentarios/components/ComentariosSecao';
export { HistoricoSecao } from '@/features/historico/components/HistoricoSecao';
