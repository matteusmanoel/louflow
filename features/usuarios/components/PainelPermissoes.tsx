'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
import { CHAVES_PERMISSAO, permissoesPadrao, type ChavePermissao, type Perfil } from '@/lib/permissions';
import type { Resultado } from '@/lib/action';
import type { ConcessaoUsuario } from '../consultas';

type Props = {
  usuarioId: string;
  perfil: Perfil;
  permissoes: ConcessaoUsuario[];
  acaoConcederPermissao: (entrada: unknown) => Promise<Resultado<null>>;
};

const ROTULOS: Record<ChavePermissao, string> = {
  criarDemandas: 'Criar Demandas',
  definirOutroEditor: 'Definir outro Editor',
  verTodasDemandas: 'Ver todas as Demandas',
  editarDemandas: 'Editar Demandas',
  atribuirEditor: 'Atribuir Editor',
  alterarStatus: 'Alterar Status',
  alterarPrioridade: 'Alterar Prioridade',
  excluirDemandas: 'Excluir Demandas',
  enviarFicha: 'Enviar Ficha Técnica',
  verAgenda: 'Ver Agenda',
  gerenciarAgenda: 'Gerenciar Agenda',
  verCaptacoes: 'Ver Captações',
  gerenciarCaptacoes: 'Gerenciar Captações',
  acessarCortes: 'Acessar Cortes',
  verAbaCortes: 'Ver aba Cortes',
  verRelatorios: 'Ver Relatórios',
  usarAnalista: 'Usar Analista',
  gerenciarUsuarios: 'Gerenciar Usuários',
  verLixeira: 'Ver Lixeira',
  verSorteios: 'Ver Sorteios',
  operarDrone: 'Operar Drone',
  editorPadraoCortes: 'Editor padrão de Cortes',
  notaInformativaRanking: 'Nota informativa no ranking',
};

export function PainelPermissoes({ usuarioId, perfil, permissoes, acaoConcederPermissao }: Props) {
  const padrao = permissoesPadrao(perfil);

  const [estado, dispatch, pendente] = useActionState(
    async (
      _prev: Resultado<null> | null,
      entrada: { chave: ChavePermissao; concedida: boolean },
    ) => acaoConcederPermissao({ usuarioId, ...entrada }),
    null,
  );

  const concedidaMap = Object.fromEntries(
    permissoes.map((p) => [p.chave, p.concedida])
  ) as Record<ChavePermissao, boolean | undefined>;

  return (
    <div className="flex flex-col gap-3">
      {estado && !estado.ok && (
        <Alert variant="destructive">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}
      {estado?.ok && (
        <Alert variant="info">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}

      <TabelaWrapper>
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Permissão</Th>
              <Th>Padrão do perfil</Th>
              <Th>Concessão individual</Th>
              <Th className="text-right">
                <span className="sr-only">Ação</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {CHAVES_PERMISSAO.map((chave) => {
              const valorPadrao = padrao[chave];
              const concessao = concedidaMap[chave];
              const efetiva = concessao !== undefined ? concessao : valorPadrao;

              return (
                <tr key={chave} className="hover:bg-[var(--tabela-linha-hover)]">
                  <Td>{ROTULOS[chave]}</Td>
                  <Td>{valorPadrao ? 'Sim' : 'Não'}</Td>
                  <Td>{concessao !== undefined ? (concessao ? 'Concedida' : 'Revogada') : '—'}</Td>
                  <Td className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendente}
                      type="button"
                      onClick={() => dispatch({ chave, concedida: !efetiva })}
                    >
                      {efetiva ? 'Revogar' : 'Conceder'}
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TabelaWrapper>
    </div>
  );
}
