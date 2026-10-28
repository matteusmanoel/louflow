import { hojeSaoPaulo, periodoPadrao, diaValido, type Periodo } from '@/features/metricas/periodo';

export type Intencao =
  | { tipo: 'contagem'; periodo: Periodo }
  | { tipo: 'atrasadas' }
  | { tipo: 'tempo'; periodo: Periodo }
  | { tipo: 'resumo'; dia: string }
  | { tipo: 'nao-suportada' };

function ultimoDia(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function datasNaFrase(frase: string): string[] {
  const iso = [...frase.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]!).filter(diaValido);
  if (iso.length >= 2) return [iso[0]!, iso[1]!].sort();

  const brasileiras = [...frase.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)]
    .map((m) => `${m[3]}-${m[2]}-${m[1]}`)
    .filter(diaValido);
  if (brasileiras.length >= 2) return [brasileiras[0]!, brasileiras[1]!].sort();

  if (iso.length === 0 && brasileiras.length === 0) {
    const mes = /\b(\d{4})-(\d{2})\b/.exec(frase);
    if (mes) {
      const ano = Number(mes[1]);
      const numeroMes = Number(mes[2]);
      if (numeroMes >= 1 && numeroMes <= 12) {
        const fim = String(ultimoDia(ano, numeroMes)).padStart(2, '0');
        const mm = String(numeroMes).padStart(2, '0');
        return [`${ano}-${mm}-01`, `${ano}-${mm}-${fim}`];
      }
    }
  }

  if (iso.length === 1) return [iso[0]!, iso[0]!];
  if (brasileiras.length === 1) return [brasileiras[0]!, brasileiras[0]!];
  return [];
}

function tipoDe(frase: string): Intencao['tipo'] {
  if (/tempo m[eé]dio|dura[cç][aã]o m[eé]dia/.test(frase)) return 'tempo';
  if (/atrasad/.test(frase)) return 'atrasadas';
  if (/resumo|movimenta[cç][aã]o do dia|o que entrou/.test(frase)) return 'resumo';
  if (/conclu[ií]|quantas|produtividade/.test(frase)) return 'contagem';
  return 'nao-suportada';
}

/** Classifica a pergunta sem consultar o banco e sem inventar número. */
export function interpretar(pergunta: string, agora = new Date()): Intencao {
  const frase = pergunta.trim().toLocaleLowerCase('pt-BR');
  const tipo = tipoDe(frase);
  if (tipo === 'nao-suportada') return { tipo };
  if (tipo === 'atrasadas') return { tipo };

  const datas = datasNaFrase(frase);
  if (tipo === 'resumo') {
    return { tipo, dia: datas[0] ?? hojeSaoPaulo(agora) };
  }

  const periodo = datas.length === 2 ? { inicio: datas[0]!, fim: datas[1]! } : periodoPadrao(agora);
  return { tipo, periodo };
}
