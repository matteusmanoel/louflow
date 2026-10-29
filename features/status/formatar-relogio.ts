/** Tempo ativo no formato do relógio: horas, minutos e segundos. */
export function formatarRelogio(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const mm = String(minutos).padStart(2, '0');
  const ss = String(segundos).padStart(2, '0');
  if (horas > 0) return `${horas}h ${mm}min ${ss}s`;
  return `${mm}min ${ss}s`;
}
