/**
 * Tema ECharts derivado dos tokens de app/globals.css.
 * O canvas não resolve var(--x), então os valores são lidos do DOM no momento do init
 * e relidos quando data-tema muda. Nenhuma cor é definida aqui.
 */

/** Só tokens com valor nos dois temas (os --prioridade-* não têm variante escura). */
const TOKENS_PALETA = [
  '--loumar-600',
  '--alerta-amanha',
  '--loumar-700',
  '--alerta-hoje',
  '--texto-suave',
  '--alerta-atrasada',
] as const;

function lerToken(estilo: CSSStyleDeclaration, nome: string): string {
  return estilo.getPropertyValue(nome).trim();
}

export function criarTemaLoumar(raiz: HTMLElement = document.documentElement): Record<string, unknown> {
  const estilo = getComputedStyle(raiz);
  const texto = lerToken(estilo, '--texto-forte');
  const textoSuave = lerToken(estilo, '--texto-suave');
  const borda = lerToken(estilo, '--borda-app');
  const linha = lerToken(estilo, '--tabela-linha-borda') || borda;
  const superficie = lerToken(estilo, '--superficie');
  const fonte = lerToken(estilo, '--fonte-ui') || 'sans-serif';

  const eixo = {
    axisLine: { lineStyle: { color: borda } },
    axisTick: { lineStyle: { color: borda } },
    axisLabel: { color: textoSuave },
    splitLine: { lineStyle: { color: linha } },
    nameTextStyle: { color: textoSuave },
  };

  return {
    color: TOKENS_PALETA.map((t) => lerToken(estilo, t)).filter(Boolean),
    backgroundColor: 'transparent',
    textStyle: { color: texto, fontFamily: fonte },
    title: {
      textStyle: { color: texto, fontFamily: fonte },
      subtextStyle: { color: textoSuave, fontFamily: fonte },
    },
    legend: { textStyle: { color: textoSuave, fontFamily: fonte } },
    tooltip: {
      backgroundColor: superficie,
      borderColor: borda,
      textStyle: { color: texto, fontFamily: fonte },
    },
    categoryAxis: eixo,
    valueAxis: eixo,
    timeAxis: eixo,
    logAxis: eixo,
  };
}
