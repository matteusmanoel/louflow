'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import type { Perfil } from '@/lib/permissions';
import type { Resultado } from '@/lib/action';
import type { UsuarioDetalhe } from '../consultas';

type Props = {
  acao: (entrada: unknown) => Promise<Resultado<{ pin: string; usuarioId: string } | null>>;
  usuario?: UsuarioDetalhe;
  onPinGerado?: (pin: string) => void;
};

const PERFIS: Perfil[] = ['Administrador', 'Editor', 'Influencer', 'Premios'];

/** Exibição. O value do Select e o dado salvo continuam sem acento. */
const ROTULO_PERFIL: Record<Perfil, string> = {
  Administrador: 'Administrador',
  Editor: 'Editor',
  Influencer: 'Influencer',
  Premios: 'Prêmios',
};

function Obrigatorio() {
  return (
    <span className="text-alerta-atrasada" aria-hidden>
      *
    </span>
  );
}

export function FormularioUsuario({ acao, usuario, onPinGerado }: Props) {
  const [estado, dispatch, pendente] = useActionState(
    async (
      _prev: Resultado<{ pin: string; usuarioId: string } | null> | null,
      formData: FormData
    ) => {
      const entrada = {
        ...(usuario ? { usuarioId: usuario.id } : {}),
        nome: formData.get('nome'),
        email: formData.get('email'),
        perfil: formData.get('perfil'),
        editorLabel: formData.get('editorLabel') || null,
      };
      const resultado = await acao(entrada);
      if (resultado.ok && resultado.dados?.pin && onPinGerado) {
        onPinGerado(resultado.dados.pin);
      }
      return resultado;
    },
    null
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={dispatch} className="flex flex-col gap-4">
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

          <div className="space-y-1.5">
            <Label htmlFor="nome">
              Nome completo <Obrigatorio />
            </Label>
            <Input
              id="nome"
              name="nome"
              defaultValue={usuario?.nome}
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              E-mail <Obrigatorio />
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={usuario?.email}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="perfil">
              Perfil <Obrigatorio />
            </Label>
            <Select name="perfil" defaultValue={usuario?.perfil ?? 'Editor'} required>
              <SelectTrigger id="perfil">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERFIS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULO_PERFIL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editorLabel">Rótulo de editor (exibido nas Demandas)</Label>
            <Input
              id="editorLabel"
              name="editorLabel"
              defaultValue={usuario?.editorLabel ?? ''}
              maxLength={50}
            />
          </div>

          <RodapeAcoes
            secundaria={
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/usuarios">Cancelar</Link>
              </Button>
            }
            primaria={
              <Button type="submit" disabled={pendente} className="w-full sm:w-auto">
                {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pendente ? 'Salvando…' : usuario ? 'Salvar alterações' : 'Criar usuário'}
              </Button>
            }
          />
        </form>
      </CardContent>
    </Card>
  );
}
