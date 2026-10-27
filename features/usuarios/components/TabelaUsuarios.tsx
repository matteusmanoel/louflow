import type { Perfil } from '@/lib/permissions';
import type { UsuarioListado } from '../consultas';
import { AcoesLinha } from '@/components/ui/acoes-linha';
import { Badge } from '@/components/ui/badge';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Td, Th, classeColunaAcoes } from '@/components/ui/tabela';
import { Users } from 'lucide-react';

/** Exibição. O valor persistido do perfil Prêmios continua sem acento. */
const ROTULO_PERFIL: Record<Perfil, string> = {
  Administrador: 'Administrador',
  Editor: 'Editor',
  Influencer: 'Influencer',
  Premios: 'Prêmios',
};

function BadgeSituacao({ ativo, deveTrocarPin }: { ativo: boolean; deveTrocarPin: boolean }) {
  if (!ativo) {
    return (
      <Badge variant="situacao-inativo" className="pointer-events-none">
        Inativo
      </Badge>
    );
  }
  if (deveTrocarPin) {
    return (
      <Badge variant="situacao-pendente" className="pointer-events-none">
        PIN pendente
      </Badge>
    );
  }
  return (
    <Badge variant="situacao-ativo" className="pointer-events-none">
      Ativo
    </Badge>
  );
}

export function TabelaUsuarios({ usuarios }: { usuarios: UsuarioListado[] }) {
  if (usuarios.length === 0) {
    return (
      <EstadoVazio
        icone={Users}
        titulo="Nenhum usuário cadastrado"
        descricao="Crie o primeiro usuário para começar."
      />
    );
  }

  return (
    <TabelaWrapper>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>E-mail</Th>
            <Th>Perfil</Th>
            <Th>Editor</Th>
            <Th>Situação</Th>
            <Th className={`${classeColunaAcoes} z-10 bg-[var(--tabela-cabecalho-fundo)]`}>
              <span className="sr-only">Ações</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="group transition-colors hover:bg-[var(--tabela-linha-hover)]">
              <Td>{u.nome}</Td>
              <Td>{u.email}</Td>
              <Td>{ROTULO_PERFIL[u.perfil]}</Td>
              <Td>{u.editorLabel ?? '—'}</Td>
              <Td>
                <BadgeSituacao ativo={u.ativo} deveTrocarPin={u.deveTrocarPin} />
              </Td>
              <Td className={`${classeColunaAcoes} z-10 group-hover:bg-[var(--tabela-linha-hover)]`}>
                <AcoesLinha
                  rotulo={u.nome}
                  itens={[{ rotulo: 'Editar', href: `/usuarios/${u.id}` }]}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaWrapper>
  );
}
