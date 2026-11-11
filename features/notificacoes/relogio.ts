/** Hora e dia civil em America/Sao_Paulo, para a cadência dos avisos. */
export function relogioSaoPaulo(agora: Date): { hora: number; dia: string } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);
  const pegar = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  let hora = Number(pegar('hour'));
  if (hora === 24) hora = 0;
  return { hora, dia: `${pegar('year')}-${pegar('month')}-${pegar('day')}` };
}

export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const data = new Date(Date.UTC(ano!, (mes ?? 1) - 1, dia ?? 1));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function formatarDia(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
