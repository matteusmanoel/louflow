/**
 * Datas de exibição. Zona protegida: um único formato (dd/MM/yyyy, America/Sao_Paulo)
 * para as telas deixarem de misturar ISO e pt-BR.
 * Data sem hora (`AAAA-MM-DD`) é calendário, não instante: não passa por UTC,
 * senão o dia recua três horas em São Paulo.
 */

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function calendario(valor: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

export function formatarData(valor: string | Date | null | undefined): string {
  if (valor == null || valor === '') return '—';
  if (typeof valor === 'string') {
    const dia = calendario(valor);
    if (dia) return dia;
  }
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);
}

export function formatarDataHora(valor: string | Date | null | undefined): string {
  if (valor == null || valor === '') return '—';
  if (typeof valor === 'string') {
    const dia = calendario(valor);
    if (dia) return dia;
  }
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return DATA_HORA.format(data);
}
