import Link from 'next/link';
import type { UsuarioListado } from '../consultas';
import s from './usuarios.module.css';

export function TabelaUsuarios({ usuarios }: { usuarios: UsuarioListado[] }) {
  if (usuarios.length === 0) {
    return <p className={s.vazio}>Nenhum usuário cadastrado.</p>;
  }

  return (
    <div className={s.tabelaWrapper}>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Editor</th>
            <th>Situação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className={u.ativo ? '' : s.inativo}>
              <td>{u.nome}</td>
              <td>{u.email}</td>
              <td>{u.perfil}</td>
              <td>{u.editorLabel ?? '—'}</td>
              <td>
                {u.ativo ? (
                  u.deveTrocarPin ? (
                    <span className={s.pinPendente}>PIN pendente</span>
                  ) : (
                    <span className={s.ativo}>Ativo</span>
                  )
                ) : (
                  <span className={s.inativoLabel}>Inativo</span>
                )}
              </td>
              <td>
                <Link href={`/usuarios/${u.id}`} className={s.link}>
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
