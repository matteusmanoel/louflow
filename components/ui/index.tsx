/**
 * Componentes legados — mantidos para uso exclusivo de features/acesso (zona protegida).
 * Não reutilizar em novos componentes; use os componentes shadcn em components/ui/*.tsx.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';

export function Botao({ variante = 'principal', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'principal' | 'neutro' }) {
  return <button className={[s.botao, variante === 'neutro' ? s.neutro : '', className].filter(Boolean).join(' ')} {...props} />;
}

export function Campo({ rotulo, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; id: string }) {
  return (
    <label className={s.campo} htmlFor={id}>
      <span className={s.rotulo}>{rotulo}</span>
      <input id={id} className={s.input} {...props} />
    </label>
  );
}

export function Aviso({ children, tipo = 'aviso' }: { children: ReactNode; tipo?: 'aviso' | 'erro' }) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={[s.aviso, tipo === 'erro' ? s.erro : ''].join(' ')}>
      {children}
    </div>
  );
}

/** @deprecated — use Badge from @/components/ui/badge */
export type Prioridade = 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
/** @deprecated — use Badge from @/components/ui/badge */
export type Status =
  | 'Não iniciada'
  | 'Em execução'
  | 'Pausada'
  | 'Aprovação'
  | 'Ajustes solicitados'
  | 'Concluída'
  | 'Reprovada'
  | 'Cancelada';
