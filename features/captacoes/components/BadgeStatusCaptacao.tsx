import s from './captacoes.module.css';
import type { StatusCaptacao } from '../consultas';

export function BadgeStatusCaptacao({ status }: { status: StatusCaptacao }) {
  return (
    <span className={`${s.badge} ${s[`badge-${status.replace('í', 'i')}`]}`}>
      {status}
    </span>
  );
}
