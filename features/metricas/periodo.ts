import { ErroDominio } from '@/lib/errors';

/** Dia civil em America/Sao_Paulo, no formato AAAA-MM-DD. */
export type Periodo = { inicio: string; fim: string };

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function diaValido(valor: string): boolean {
  const m = DIA.exec(valor);
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function validarDia(valor: string): string {
  if (!diaValido(valor)) throw new ErroDominio('Data inválida.');
  return valor;
}

export function validarPeriodo(periodo: Periodo): Periodo {
  if (!diaValido(periodo.inicio) || !diaValido(periodo.fim) || periodo.inicio > periodo.fim) {
    throw new ErroDominio('Período inválido.');
  }
  return periodo;
}

/** Mês civil corrente em America/Sao_Paulo. */
export function periodoPadrao(agora = new Date()): Periodo {
  const hoje = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
  const [ano, mes] = hoje.split('-');
  const ultimo = new Date(Date.UTC(Number(ano), Number(mes), 0)).getUTCDate();
  return {
    inicio: `${ano}-${mes}-01`,
    fim: `${ano}-${mes}-${String(ultimo).padStart(2, '0')}`,
  };
}

export function periodoOuPadrao(inicio?: string, fim?: string): Periodo {
  if (!inicio || !fim) return periodoPadrao();
  if (!diaValido(inicio) || !diaValido(fim) || inicio > fim) return periodoPadrao();
  return { inicio, fim };
}

export function hojeSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}
