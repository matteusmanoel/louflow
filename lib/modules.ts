import type { UsuarioSessao } from './session';

/**
 * Registro de módulos pré-cadastrado. As fatias NÃO editam este arquivo:
 * cada uma implementa apenas a própria rota `app/(app)/<slug>/` e a pasta `features/<slug>/`.
 */

export type GrupoModulo = 'Produção' | 'Postagem' | 'Recursos' | 'Acompanhamento' | 'Administração' | 'Conta';

export type Modulo = {
  slug: string;
  rotulo: string;
  grupo: GrupoModulo;
  /** Work Item responsável pela implementação (referência para agentes). */
  fatia: string;
  permitido: (u: UsuarioSessao) => boolean;
};

const naoPremios = (u: UsuarioSessao) => u.perfil !== 'Premios';
const admin = (u: UsuarioSessao) => u.perfil === 'Administrador';

export const MODULOS: readonly Modulo[] = [
  { slug: 'dashboard', rotulo: 'Dashboard', grupo: 'Acompanhamento', fatia: 'S2-02 #11574', permitido: naoPremios },
  { slug: 'demandas', rotulo: 'Demandas', grupo: 'Produção', fatia: 'S1-02 #11557', permitido: naoPremios },
  { slug: 'fichas', rotulo: 'Fila de Fichas', grupo: 'Produção', fatia: 'S1-02 #11557', permitido: (u) => u.perfil === 'Administrador' || u.perfil === 'Editor' },
  { slug: 'ficha-tecnica', rotulo: 'Enviar Ficha Técnica', grupo: 'Produção', fatia: 'S1-11 #11566', permitido: (u) => naoPremios(u) && u.permissoes.enviarFicha },
  { slug: 'aprovacoes', rotulo: 'Aprovações', grupo: 'Produção', fatia: 'S1-14 #11569', permitido: (u) => u.perfil === 'Administrador' || u.perfil === 'Influencer' || u.ehAprovadorDelegado },
  { slug: 'pendencias', rotulo: 'Pendências', grupo: 'Postagem', fatia: 'S1-16 #11571', permitido: (u) => u.perfil === 'Influencer' || admin(u) },
  { slug: 'agenda', rotulo: 'Agenda de Postagem', grupo: 'Postagem', fatia: 'S1-07 #11562', permitido: (u) => naoPremios(u) && u.permissoes.verAgenda },
  { slug: 'captacoes', rotulo: 'Captações', grupo: 'Recursos', fatia: 'S1-03 #11558', permitido: (u) => naoPremios(u) && u.permissoes.verCaptacoes },
  { slug: 'midia-movel', rotulo: 'Mídia Móvel', grupo: 'Recursos', fatia: 'S1-04 #11559', permitido: naoPremios },
  { slug: 'drone', rotulo: 'Uso de Drone', grupo: 'Recursos', fatia: 'S1-05 #11560', permitido: (u) => naoPremios(u) && u.permissoes.operarDrone },
  { slug: 'cortes', rotulo: 'Cortes', grupo: 'Produção', fatia: 'S1-06 #11561', permitido: (u) => naoPremios(u) && u.permissoes.verAbaCortes },
  { slug: 'equipamentos', rotulo: 'Catálogo de Equipamentos', grupo: 'Recursos', fatia: 'S3-02 #11579', permitido: naoPremios },
  { slug: 'relatorio', rotulo: 'Relatório Diário', grupo: 'Acompanhamento', fatia: 'S2-03 #11575', permitido: (u) => naoPremios(u) && u.permissoes.verRelatorios },
  { slug: 'ranking', rotulo: 'Ranking', grupo: 'Acompanhamento', fatia: 'S2-04 #11576', permitido: (u) => naoPremios(u) && u.permissoes.verRelatorios },
  { slug: 'analista', rotulo: 'Analista', grupo: 'Acompanhamento', fatia: 'S2-05 #11577', permitido: (u) => naoPremios(u) && u.permissoes.usarAnalista },
  { slug: 'wiki', rotulo: 'Wiki', grupo: 'Acompanhamento', fatia: 'S2-01 #11573', permitido: naoPremios },
  { slug: 'sorteios', rotulo: 'Sorteios', grupo: 'Acompanhamento', fatia: 'S3-01 #11578', permitido: (u) => u.permissoes.verSorteios },
  { slug: 'usuarios', rotulo: 'Usuários', grupo: 'Administração', fatia: 'S1-01 #11556', permitido: (u) => naoPremios(u) && u.permissoes.gerenciarUsuarios },
  { slug: 'lixeira', rotulo: 'Lixeira', grupo: 'Administração', fatia: 'S1-13 #11568', permitido: (u) => naoPremios(u) && u.permissoes.verLixeira },
  { slug: 'auditoria', rotulo: 'Auditoria', grupo: 'Administração', fatia: 'S1-13 #11568', permitido: admin },
  { slug: 'preferencias', rotulo: 'Preferências', grupo: 'Conta', fatia: 'S1-08 #11563', permitido: naoPremios },
];

export const ORDEM_GRUPOS: readonly GrupoModulo[] = ['Produção', 'Postagem', 'Recursos', 'Acompanhamento', 'Administração', 'Conta'];

export function modulo(slug: string): Modulo | undefined {
  return MODULOS.find((m) => m.slug === slug);
}

export function modulosPermitidos(u: UsuarioSessao): Modulo[] {
  return MODULOS.filter((m) => m.permitido(u));
}

/** Rota inicial: primeiro módulo permitido na ordem de preferência. */
export function rotaInicial(u: UsuarioSessao): string {
  const preferidos = ['demandas', 'sorteios'];
  const alvo = preferidos.map(modulo).find((m) => m && m.permitido(u)) ?? modulosPermitidos(u)[0];
  return alvo ? `/${alvo.slug}` : '/sem-acesso';
}
