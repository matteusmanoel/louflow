/**
 * [PROTEGIDO] Chaves de Permissão e padrões por Perfil.
 * Toda chave nova entra aqui e no CHECK de user_permissions no mesmo PR.
 */

export const PERFIS = ['Administrador', 'Editor', 'Influencer', 'Premios'] as const;
export type Perfil = (typeof PERFIS)[number];

export const CHAVES_PERMISSAO = [
  'criarDemandas',
  'definirOutroEditor',
  'verTodasDemandas',
  'editarDemandas',
  'atribuirEditor',
  'alterarStatus',
  'alterarPrioridade',
  'excluirDemandas',
  'enviarFicha',
  'verAgenda',
  'gerenciarAgenda',
  'verCaptacoes',
  'gerenciarCaptacoes',
  'acessarCortes',
  'verAbaCortes',
  'verRelatorios',
  'usarAnalista',
  'gerenciarUsuarios',
  'verLixeira',
  'verSorteios',
  'operarDrone',
  'editorPadraoCortes',
  'notaInformativaRanking',
] as const;
export type ChavePermissao = (typeof CHAVES_PERMISSAO)[number];
export type Permissoes = Record<ChavePermissao, boolean>;

/**
 * Chaves que marcam uma designação, não um privilégio: nem o Administrador as recebe
 * por padrão, e a concessão individual vale para qualquer Perfil exceto Prêmios.
 */
const DESIGNACOES: readonly ChavePermissao[] = ['editorPadraoCortes', 'notaInformativaRanking'];

export function ehChavePermissao(valor: string): valor is ChavePermissao {
  return (CHAVES_PERMISSAO as readonly string[]).includes(valor);
}

export function permissoesPadrao(perfil: Perfil): Permissoes {
  const base = Object.fromEntries(CHAVES_PERMISSAO.map((c) => [c, false])) as Permissoes;

  switch (perfil) {
    case 'Administrador':
      for (const c of CHAVES_PERMISSAO) base[c] = !DESIGNACOES.includes(c);
      return base;
    case 'Premios':
      base.verSorteios = true;
      return base;
    case 'Influencer':
      base.enviarFicha = true;
      base.verAgenda = true;
      base.gerenciarAgenda = true;
      base.verSorteios = true;
      return base;
    case 'Editor':
      base.verCaptacoes = true;
      base.gerenciarCaptacoes = true;
      base.verSorteios = true;
      return base;
  }
}

export type ConcessaoIndividual = { chave: ChavePermissao; concedida: boolean };

/**
 * Permissões efetivas = padrão do Perfil + concessões individuais.
 * Administrador e Prêmios ignoram concessões, exceto designações (só para Administrador).
 */
export function resolverPermissoes(perfil: Perfil, concessoes: readonly ConcessaoIndividual[]): Permissoes {
  const efetivas = permissoesPadrao(perfil);
  if (perfil === 'Premios') return efetivas;

  for (const { chave, concedida } of concessoes) {
    if (perfil === 'Administrador' && !DESIGNACOES.includes(chave)) continue;
    efetivas[chave] = concedida;
  }
  return efetivas;
}
