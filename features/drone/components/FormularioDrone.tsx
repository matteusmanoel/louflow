'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Botao, Campo, Aviso } from '@/components/ui';
import { PERFIS_ATENDIDOS } from '../schema';
import type { EntradaRegistrarUsoDrone } from '../schema';
import { registrarUsoDrone, editarUsoDrone } from '../actions';

type ModoNovo = {
  modo: 'novo';
};

type ModoEditar = {
  modo: 'editar';
  id: string;
  versao: string; // updated_at ISO string
  valorInicial: EntradaRegistrarUsoDrone;
};

type Props = ModoNovo | ModoEditar;

export function FormularioDrone(props: Props) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const inicial: EntradaRegistrarUsoDrone =
    props.modo === 'editar'
      ? props.valorInicial
      : { used_on: '', responsible: '', served_profile: '', reason: '', location: '' };

  const [campos, setCampos] = useState(inicial);

  function atualizar(campo: keyof EntradaRegistrarUsoDrone, valor: string) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    iniciarTransicao(async () => {
      let resultado;

      if (props.modo === 'editar') {
        resultado = await editarUsoDrone({ ...campos, id: props.id, versao: props.versao });
      } else {
        resultado = await registrarUsoDrone(campos);
      }

      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }

      router.push('/drone');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20, maxWidth: 540 }}>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <Campo
        rotulo="Data do uso"
        id="used_on"
        type="date"
        required
        value={campos.used_on}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(e) => atualizar('used_on', e.target.value)}
      />

      <Campo
        rotulo="Responsável"
        id="responsible"
        type="text"
        required
        maxLength={200}
        value={campos.responsible}
        onChange={(e) => atualizar('responsible', e.target.value)}
      />

      <label style={{ display: 'grid', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--texto-suave)',
          }}
        >
          Perfil atendido
        </span>
        <select
          id="served_profile"
          required
          value={campos.served_profile}
          onChange={(e) => atualizar('served_profile', e.target.value)}
          style={{
            minHeight: 42,
            padding: '0 12px',
            borderRadius: 'var(--raio-input)',
            border: '1px solid var(--borda-app)',
            background: 'var(--superficie)',
            fontSize: 14,
          }}
        >
          <option value="">Selecione…</option>
          {PERFIS_ATENDIDOS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <Campo
        rotulo="Motivo"
        id="reason"
        type="text"
        required
        maxLength={500}
        value={campos.reason}
        onChange={(e) => atualizar('reason', e.target.value)}
      />

      <Campo
        rotulo="Local"
        id="location"
        type="text"
        required
        maxLength={200}
        value={campos.location}
        onChange={(e) => atualizar('location', e.target.value)}
      />

      <div
        style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: 'var(--fundo-app)',
          border: '1px solid var(--borda-app)',
          fontSize: 13,
          color: 'var(--texto-suave)',
        }}
      >
        Valor fixo por uso: <strong>R$ 250,00</strong>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : props.modo === 'editar' ? 'Salvar alterações' : 'Registrar uso'}
        </Botao>
        <Botao
          type="button"
          variante="neutro"
          onClick={() => router.push('/drone')}
          disabled={pendente}
        >
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
