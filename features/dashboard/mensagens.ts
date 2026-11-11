/** Frases genéricas do painel. O índice do dia é estável; "Nova mensagem" troca no navegador. */

const INICIOS = [
  'Hoje é um ótimo dia para',
  'Seu talento aparece quando você decide',
  'Um passo consistente pode',
  'A criatividade ganha força ao',
  'O trabalho de hoje pode',
  'Você não precisa fazer tudo; precisa',
  'Grandes resultados começam ao',
  'Sua melhor versão surge quando você escolhe',
  'Mesmo nos dias corridos, vale a pena',
  'Cada tarefa concluída ajuda a',
  'Confie no processo e permita-se',
  'O progresso fica mais leve quando você consegue',
  'Sua dedicação tem o poder de',
  'Uma boa ideia cresce quando você começa a',
  'O próximo avanço pode nascer ao',
  'Você já chegou longe; agora é hora de',
  'A excelência se constrói ao',
  'Seu olhar único pode',
  'Hoje, escolha a coragem de',
  'Pequenas atitudes diárias conseguem',
] as const;

const FINAIS = [
  'transformar uma ideia simples em algo memorável.',
  'dar atenção ao próximo passo possível.',
  'criar com intenção e finalizar com orgulho.',
  'enxergar possibilidades onde antes havia obstáculos.',
  'avançar com calma, foco e confiança.',
  'fazer bem aquilo que realmente importa.',
  'trocar a pressão pelo compromisso com o progresso.',
  'construir um resultado melhor do que o de ontem.',
  'valorizar cada pequena vitória do caminho.',
  'colocar sua personalidade em tudo o que produz.',
  'começar antes que tudo pareça perfeito.',
  'usar os desafios como matéria-prima para crescer.',
  'organizar uma prioridade e seguir até o fim.',
  'compartilhar ideias e fortalecer toda a equipe.',
  'aprender algo novo durante o próprio processo.',
  'manter a constância mesmo sem pressa.',
  'reconhecer o valor do trabalho que você entrega.',
  'simplificar o difícil e tornar o possível visível.',
  'confiar mais na experiência que você já conquistou.',
  'encerrar o dia sabendo que você fez diferença.',
] as const;

export const TOTAL_MENSAGENS = INICIOS.length * FINAIS.length;

export function diaMensagem(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

export function indiceInicialMensagem(chave: string): number {
  let numero = 2166136261;
  for (let i = 0; i < chave.length; i += 1) {
    numero ^= chave.charCodeAt(i);
    numero = Math.imul(numero, 16777619) >>> 0;
  }
  return numero % TOTAL_MENSAGENS;
}

export function mensagemPorIndice(indice: number): string {
  const seguro = ((indice % TOTAL_MENSAGENS) + TOTAL_MENSAGENS) % TOTAL_MENSAGENS;
  const inicio = INICIOS[Math.floor(seguro / FINAIS.length) % INICIOS.length]!;
  const final = FINAIS[seguro % FINAIS.length]!;
  return `${inicio} ${final}`;
}

export function saudacaoMensagem(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0];
  return primeiro ? `${primeiro}, leve essa energia para o seu dia.` : 'Leve essa energia para o seu dia.';
}
