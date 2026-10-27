'use client';

import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ativarUsuario,
  concederPermissao,
  desativarUsuario,
  editarUsuario,
  gerenciarDelegados,
  redefinirPin,
} from '@/features/usuarios/actions';
import { cn } from '@/lib/utils';
import type { UsuarioDetalhe } from '../consultas';
import { FormularioUsuario } from './FormularioUsuario';
import { ModalPinProvisorio } from './ModalPinProvisorio';
import { PainelPermissoes } from './PainelPermissoes';
import type { Resultado } from '@/lib/action';

type Props = { usuario: UsuarioDetalhe };

function TituloSecao({ children }: { children: string }) {
  return <h2 className="text-base font-semibold leading-none tracking-tight text-[var(--texto-forte)]">{children}</h2>;
}

export function DetalheUsuarioCliente({ usuario }: Props) {
  const [pinProvisorio, setPinProvisorio] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, setPendente] = useState(false);

  async function acaoEditar(entrada: unknown): Promise<Resultado<{ pin: string; usuarioId: string } | null>> {
    return editarUsuario(entrada) as Promise<Resultado<{ pin: string; usuarioId: string } | null>>;
  }

  async function executar(chamada: () => Promise<{ ok: boolean; mensagem: string }>) {
    setPendente(true);
    setMensagem(null);
    const res = await chamada();
    setMensagem({ ok: res.ok, texto: res.mensagem });
    setPendente(false);
  }

  function handleAtivar() {
    void executar(() => ativarUsuario({ usuarioId: usuario.id }));
  }

  function handleDesativar() {
    void executar(() => desativarUsuario({ usuarioId: usuario.id }));
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
    <div className="flex flex-col gap-6">
      {pinProvisorio && (
        <ModalPinProvisorio pin={pinProvisorio} onFechar={() => setPinProvisorio(null)} />
      )}

      {mensagem && (
        <Alert variant={mensagem.ok ? 'info' : 'destructive'}>
          <AlertDescription>{mensagem.texto}</AlertDescription>
        </Alert>
      )}

      <FormularioUsuario acao={acaoEditar} usuario={usuario} />

      <Card>
        <CardHeader>
          <TituloSecao>Ações do usuário</TituloSecao>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {usuario.ativo ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={pendente} type="button">
                    {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    Desativar usuário
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {usuario.nome} deixa de acessar o sistema. É possível ativar de novo depois.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      className={cn(buttonVariants({ variant: 'destructive' }))}
                      onClick={handleDesativar}
                    >
                      Desativar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button variant="outline" onClick={handleAtivar} disabled={pendente} type="button">
                {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Ativar usuário
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleRedefinirPin}
              disabled={pendente || !usuario.ativo}
              type="button"
            >
              {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Redefinir PIN
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <TituloSecao>Permissões</TituloSecao>
        </CardHeader>
        <CardContent>
          <PainelPermissoes
            usuarioId={usuario.id}
            perfil={usuario.perfil}
            permissoes={usuario.permissoes}
            acaoConcederPermissao={concederPermissao}
          />
        </CardContent>
      </Card>

      {(usuario.perfil === 'Administrador' || usuario.perfil === 'Editor') && (
        <Card>
          <CardHeader>
            <TituloSecao>Delegados de aprovação</TituloSecao>
          </CardHeader>
          <CardContent>
            {usuario.delegacoesComo.length === 0 ? (
              <EstadoVazio
                icone={Users}
                titulo="Nenhum editor delegado"
                descricao="Nenhum editor foi definido como delegado para este usuário."
                className="py-8"
              />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {usuario.delegacoesComo.map((d) => (
                  <li
                    key={d.editorId}
                    className="flex items-center justify-between border-b border-[var(--borda-app)] py-1.5 last:border-0"
                  >
                    <span className="text-sm">{d.editorNome}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendente}
                      type="button"
                      onClick={async () => {
                        const res = await gerenciarDelegados({
                          aprovadorId: usuario.id,
                          editorId: d.editorId,
                          adicionar: false,
                        });
                        setMensagem({ ok: res.ok, texto: res.mensagem });
                      }}
                    >
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
