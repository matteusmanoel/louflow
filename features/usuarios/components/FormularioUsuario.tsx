'use client';

import { useActionState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import type { Perfil } from '@/lib/permissions';
import type { Resultado } from '@/lib/action';
import type { UsuarioDetalhe } from '../consultas';

type Props = {
  acao: (entrada: unknown) => Promise<Resultado<{ pin: string; usuarioId: string } | null>>;
  usuario?: UsuarioDetalhe;
  onPinGerado?: (pin: string) => void;
};

const PERFIS: Perfil[] = ['Administrador', 'Editor', 'Influencer', 'Premios'];

export function FormularioUsuario({ acao, usuario, onPinGerado }: Props) {
  const [estado, dispatch, pendente] = useActionState(
    async (_prev: Resultado<{ pin: string; usuarioId: string } | null> | null, formData: FormData) => {
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
    null,
  );

  return (
    <Cartao>
      <form action={dispatch}>
        {estado && !estado.ok && <Aviso tipo="erro">{estado.mensagem}</Aviso>}
        {estado?.ok && <Aviso>{estado.mensagem}</Aviso>}

        <Campo
          rotulo="Nome completo"
          id="nome"
          name="nome"
          defaultValue={usuario?.nome}
          required
          minLength={2}
          maxLength={100}
        />
        <Campo
          rotulo="E-mail"
          id="email"
          name="email"
          type="email"
          defaultValue={usuario?.email}
          required
        />

        <label htmlFor="perfil">
          <span>Perfil</span>
          <select id="perfil" name="perfil" defaultValue={usuario?.perfil ?? 'Editor'} required>
            {PERFIS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <Campo
          rotulo="Rótulo de editor (exibido nas Demandas)"
          id="editorLabel"
          name="editorLabel"
          defaultValue={usuario?.editorLabel ?? ''}
          maxLength={50}
        />

        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : usuario ? 'Salvar alterações' : 'Criar usuário'}
        </Botao>
      </form>
    </Cartao>
  );
}
