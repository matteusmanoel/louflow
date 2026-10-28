/** Dia civil em America/Sao_Paulo, no formato AAAA-MM-DD. */

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function ehDiaCalendario(valor: string): boolean {
  const m = DIA.exec(valor);
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function diaCalendarioSaoPaulo(agora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/** Query `?dia=` válida; qualquer outro valor cai no dia de hoje em São Paulo. */
export function resolverDiaRelatorio(param: string | undefined, agora = new Date()): string {
  if (param && ehDiaCalendario(param)) return param;
  return diaCalendarioSaoPaulo(agora);
}

export function deslocarDia(dia: string, delta: number): string {
  const [ano, mes, diaMes] = dia.split('-').map(Number);
  const data = new Date(Date.UTC(ano!, mes! - 1, diaMes! + delta));
  const mm = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(data.getUTCDate()).padStart(2, '0');
  return `${data.getUTCFullYear()}-${mm}-${dd}`;
}
