/** Duração de active_ms para a tabela do Ranking. */
export function formatarDuracao(ms: number | null): string {
  if (ms == null) return '—';
  const total = Math.max(0, Math.round(ms / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  if (horas > 0) return `${horas} h ${minutos} min`;
  if (minutos > 0) return `${segundos > 0 ? `${minutos} min ${segundos} s` : `${minutos} min`}`;
  return `${segundos} s`;
}
