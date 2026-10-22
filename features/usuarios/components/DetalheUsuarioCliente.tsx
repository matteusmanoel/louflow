'use client';

import { useState } from 'react';
import { Aviso, Botao, Cartao } from '@/components/ui';
import {
  ativarUsuario,
  concederPermissao,
  desativarUsuario,
  editarUsuario,
  gerenciarDelegados,
  redefinirPin,
} from '@/features/usuarios/actions';
import type { UsuarioDetalhe } from '../consultas';
import { FormularioUsuario } from './FormularioUsuario';
import { ModalPinProvisorio } from './ModalPinProvisorio';
import { PainelPermissoes } from './PainelPermissoes';
import type { Resultado } from '@/lib/action';

type Props = { usuario: UsuarioDetalhe };

export function DetalheUsuarioCliente({ usuario }: Props) {
  const [pinProvisorio, setPinProvisorio] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, setPendente] = useState(false);

  async function acaoEditar(entrada: unknown): Promise<Resultado<{ pin: string; usuarioId: string } | null>> {
    return editarUsuario(entrada) as Promise<Resultado<{ pin: string; usuarioId: string } | null>>;
  }

  async function handleAtivacao() {
    setPendente(true);
    setMensagem(null);
    const res = usuario.ativo
      ? await desativarUsuario({ usuarioId: usuario.id })
      : await ativarUsuario({ usuarioId: usuario.id });
    setMensagem({ ok: res.ok, texto: res.mensagem });
    setPendente(false);
  }

  async function handleRedefinirPin() {
    setPendente(true);
    setMensagem(null);
    const res = await redefinirPin({ usuarioId: usuario.id });
    if (res.ok && res.dados?.pin) {
      setPinProvisorio(res.dados.pin);
    } else {
      setMensagem({ ok: res.ok, texto: res.mensagem });
    }
    setPendente(false);
  }

  return (
    <>
      {pinProvisorio && (
        <ModalPinProvisorio pin={pinProvisorio} onFechar={() => setPinProvisorio(null)} />
      )}

      {mensagem && (
        <Aviso tipo={mensagem.ok ? 'aviso' : 'erro'}>{mensagem.texto}</Aviso>
      )}

      <FormularioUsuario acao={acaoEditar} usuario={usuario} />

      <Cartao>
        <h2>Ações do usuário</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <Botao
            variante="neutro"
            onClick={handleAtivacao}
            disabled={pendente}
            type="button"
          >
            {usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
          </Botao>
          <Botao
            variante="neutro"
            onClick={handleRedefinirPin}
            disabled={pendente || !usuario.ativo}
            type="button"
          >
            Redefinir PIN
          </Botao>
        </div>
      </Cartao>

      <Cartao>
        <h2>Permissões</h2>
        <PainelPermissoes
          usuarioId={usuario.id}
          perfil={usuario.perfil}
          permissoes={usuario.permissoes}
          acaoConcederPermissao={concederPermissao}
        />
      </Cartao>

      {(usuario.perfil === 'Administrador' || usuario.perfil === 'Editor') && (
        <Cartao>
          <h2>Delegados de aprovação</h2>
          {usuario.delegacoesComo.length === 0 ? (
            <p>Nenhum editor delegado.</p>
          ) : (
            <ul>
              {usuario.delegacoesComo.map((d) => (
                <li key={d.editorId}>
                  {d.editorNome}
                  <Botao
                    variante="neutro"
                    type="button"
                    disabled={pendente}
                    onClick={async () => {
                      const res = await gerenciarDelegados({
                        aprovadorId: usuario.id,
                        editorId: d.editorId,
                        adicionar: false,
                      });
                      setMensagem({ ok: res.ok, texto: res.mensagem });
                    }}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    Remover
                  </Botao>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      )}
    </>
  );
}
