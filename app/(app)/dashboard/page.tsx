import { exigirModulo } from '@/lib/auth';
import { carregarDashboard } from '@/features/dashboard/consultas';
import { diaMensagem } from '@/features/dashboard/mensagens';
import { AtualizadoEm } from '@/features/dashboard/components/AtualizadoEm';
import { descricaoDashboard, VisaoDashboard } from '@/features/dashboard/components/VisaoDashboard';
import { MensagemDoDia } from '@/features/dashboard/components/MensagemDoDia';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaDashboard() {
  const usuario = await exigirModulo('dashboard');
  const visao = await carregarDashboard(usuario);

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Resumo personalizado"
        titulo={visao.titulo}
        descricao={descricaoDashboard(visao.perfil)}
        acao={<AtualizadoEm />}
      />
      <MensagemDoDia nome={usuario.nome} usuarioId={usuario.id} dia={diaMensagem()} />
      <VisaoDashboard
        visao={visao}
        acoes={{
          usuarioId: usuario.id,
          administrador: usuario.perfil === 'Administrador',
          podeAlterarStatus: usuario.permissoes.alterarStatus,
          ehEditor: usuario.perfil === 'Editor',
          podeAssumir: usuario.perfil === 'Editor' || usuario.perfil === 'Administrador',
        }}
      />
    </ContainerPagina>
  );
}
