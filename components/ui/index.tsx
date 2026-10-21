import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import s from './ui.module.css';

/** Componentes base. Reutilize em vez de recriar estilos nas fatias. */

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

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={[s.cartao, className].filter(Boolean).join(' ')}>{children}</section>;
}

export function Aviso({ children, tipo = 'aviso' }: { children: ReactNode; tipo?: 'aviso' | 'erro' }) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={[s.aviso, tipo === 'erro' ? s.erro : ''].join(' ')}>
      {children}
    </div>
  );
}

export function Titulo({ sobre, children }: { sobre?: string; children: ReactNode }) {
  return (
    <header>
      {sobre ? <div className={s.sobretitulo}>{sobre}</div> : null}
      <h1 className={s.titulo}>{children}</h1>
    </header>
  );
}

export type Prioridade = 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
export type Status =
  | 'Não iniciada'
  | 'Em execução'
  | 'Pausada'
  | 'Aprovação'
  | 'Ajustes solicitados'
  | 'Concluída'
  | 'Reprovada'
  | 'Cancelada';

export function BadgePrioridade({ prioridade }: { prioridade: Prioridade }) {
  return <span className={`${s.pilula} ${s[`prioridade-${prioridade}`]}`}>{prioridade}</span>;
}

export function BadgeStatus({ status }: { status: Status }) {
  return <span className={`${s.pilula} ${s.status} ${status === 'Aprovação' ? s['status-Aprovacao'] : ''}`}>{status}</span>;
}

export function TextoSuave({ children }: { children: ReactNode }) {
  return <p className={s.suave}>{children}</p>;
}
