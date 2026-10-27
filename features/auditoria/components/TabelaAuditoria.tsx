import type { RegistroAuditoria } from '../consultas';
import { ROTULOS_ACAO } from '../rotulos';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
import { formatarDataHora } from '@/lib/datas';
import { Shield } from 'lucide-react';

type Props = {
  registros: RegistroAuditoria[];
  pagina: number;
  totalPaginas: number;
  total: number;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rotuloAcao(acao: string): string {
  const conhecido = (ROTULOS_ACAO as Record<string, string>)[acao];
  if (conhecido) return conhecido;
  if (!acao.includes('_')) return acao;
  const texto = acao.replaceAll('_', ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function exibirUsuario(nome: string | null, id: string | null): { visivel: string; title?: string } {
  if (nome) return { visivel: nome };
  if (id && UUID.test(id)) return { visivel: 'Usuário', title: id };
  return { visivel: id ?? '—' };
}

function exibirAlvo(alvo: string | null): { visivel: string; title?: string } {
  if (!alvo) return { visivel: '—' };
  if (UUID.test(alvo)) return { visivel: 'Usuário', title: alvo };
  return { visivel: alvo };
}

export function TabelaAuditoria({ registros, pagina, totalPaginas, total }: Props) {
  if (registros.length === 0) {
    return (
      <EstadoVazio
        icone={Shield}
        titulo="Nenhum registro encontrado"
        descricao="Não há registros de auditoria para os critérios selecionados."
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-xs text-[var(--texto-suave)]">
        {total} {total === 1 ? 'registro' : 'registros'} — página {pagina} de {totalPaginas}
      </p>

      <TabelaWrapper>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Ação</Th>
              <Th>Usuário</Th>
              <Th>Alvo</Th>
              <Th>Detalhes</Th>
              <Th>Data</Th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => {
              const usuario = exibirUsuario(r.usuario_nome, r.user_id);
              const alvo = exibirAlvo(r.target);
              return (
                <tr key={r.id} className="transition-colors hover:bg-[var(--tabela-linha-hover)]">
                  <Td className="whitespace-nowrap">{rotuloAcao(r.action)}</Td>
                  <Td title={usuario.title}>{usuario.visivel}</Td>
                  <Td title={alvo.title}>{alvo.visivel}</Td>
                  <Td>
                    {r.details ? (
                      <span className="block max-w-[280px] truncate text-[var(--texto-suave)]" title={r.details}>
                        {r.details}
                      </span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums text-xs">{formatarDataHora(r.created_at)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TabelaWrapper>
    </div>
  );
}
