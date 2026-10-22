import { exigirModulo } from '@/lib/auth';
import { Titulo, Cartao } from '@/components/ui';
import { listarAgendaDb } from '@/features/agenda/consultas';
import { CalendarioAgenda } from '@/features/agenda/components/CalendarioAgenda';

type SearchParams = Promise<{ mes?: string; ano?: string; dia?: string }>;

export default async function PaginaAgenda({ searchParams }: { searchParams: SearchParams }) {
  const usuario = await exigirModulo('agenda');
  const params = await searchParams;

  const agora = new Date();
  const mes = Math.max(1, Math.min(12, Number(params.mes) || agora.getMonth() + 1));
  const ano = Number(params.ano) || agora.getFullYear();
  const diaSelecionado = params.dia ? Number(params.dia) : undefined;

  const demandas = await listarAgendaDb({ mes, ano }, usuario);

  return (
    <main style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Titulo sobre="Postagem">Agenda de Postagem</Titulo>
      </div>

      <Cartao>
        <CalendarioAgenda
          mes={mes}
          ano={ano}
          demandas={demandas}
          diaSelecionado={diaSelecionado}
          podeGerenciar={usuario.permissoes.gerenciarAgenda}
        />
      </Cartao>
    </main>
  );
}
