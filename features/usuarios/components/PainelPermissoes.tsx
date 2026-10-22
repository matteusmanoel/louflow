'use client';

import { useActionState } from 'react';
import { Aviso, Botao } from '@/components/ui';
import { CHAVES_PERMISSAO, permissoesPadrao, type ChavePermissao, type Perfil } from '@/lib/permissions';
import type { Resultado } from '@/lib/action';
import type { ConcessaoUsuario } from '../consultas';
import s from './usuarios.module.css';

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

  const concedidaMap = Object.fromEntries(permissoes.map((p) => [p.chave, p.concedida])) as Record<ChavePermissao, boolean | undefined>;

  return (
    <div>
      {estado && !estado.ok && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
      {estado?.ok && <Aviso>{estado.mensagem}</Aviso>}
      <table className={s.tabelaPerms}>
        <thead>
          <tr>
            <th>Permissão</th>
            <th>Padrão do Perfil</th>
            <th>Concessão individual</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {CHAVES_PERMISSAO.map((chave) => {
            const valorPadrao = padrao[chave];
            const concessao = concedidaMap[chave];
            const efetiva = concessao !== undefined ? concessao : valorPadrao;

            return (
              <tr key={chave}>
                <td>{ROTULOS[chave]}</td>
                <td>{valorPadrao ? 'Sim' : 'Não'}</td>
                <td>{concessao !== undefined ? (concessao ? 'Concedida' : 'Revogada') : '—'}</td>
                <td>
                  <Botao
                    variante="neutro"
                    disabled={pendente}
                    type="button"
                    onClick={() => dispatch({ chave, concedida: !efetiva })}
                  >
                    {efetiva ? 'Revogar' : 'Conceder'}
                  </Botao>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
