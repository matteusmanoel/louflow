'use client';

import { useTransition, useState } from 'react';
import { Campo, Botao, Aviso } from '@/components/ui';
import { criarCorte } from '../actions';
import { LINHAS_EDITORIAIS, PROGRAMAS_ORIGEM } from '../schema';
import s from './cortes.module.css';

export function FormCriarCorte({ aoSalvar }: { aoSalvar?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'aviso' | 'erro' } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const resultado = await criarCorte({
        titulo: fd.get('titulo') as string,
        influencerId: (fd.get('influencerId') as string) || null,
        dataPostagem: fd.get('dataPostagem') as string,
        linhaEditorial: fd.get('linhaEditorial') as (typeof LINHAS_EDITORIAIS)[number],
        linkVideo: (fd.get('linkVideo') as string) || null,
        programaOrigem: fd.get('programaOrigem') as (typeof PROGRAMAS_ORIGEM)[number],
      });

      if (resultado.ok) {
        form.reset();
        setMensagem({ texto: resultado.mensagem, tipo: 'aviso' });
        aoSalvar?.();
      } else {
        setMensagem({ texto: resultado.mensagem, tipo: 'erro' });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={s.formulario} aria-label="Novo corte">
      <p className={s.sectionTitle}>Novo Corte</p>

      {mensagem && (
        <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
      )}

      <Campo
        rotulo="Título (tarefa) *"
        id="titulo"
        name="titulo"
        placeholder="Ex.: Entrevista no centro de Foz"
        required
        maxLength={300}
      />

      <div className={s.grade}>
        <div>
          <label htmlFor="linhaEditorial" style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
            Linha Editorial *
          </label>
          <select id="linhaEditorial" name="linhaEditorial" required style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--raio-input)', border: '1px solid var(--borda-app)', background: 'var(--superficie)', color: 'var(--texto-forte)' }}>
            {LINHAS_EDITORIAIS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="programaOrigem" style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
            Programa de Origem *
          </label>
          <select id="programaOrigem" name="programaOrigem" required style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--raio-input)', border: '1px solid var(--borda-app)', background: 'var(--superficie)', color: 'var(--texto-forte)' }}>
            {PROGRAMAS_ORIGEM.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={s.grade}>
        <Campo
          rotulo="Data de Postagem *"
          id="dataPostagem"
          name="dataPostagem"
          type="date"
          required
        />
        <Campo
          rotulo="ID do Influencer (opcional)"
          id="influencerId"
          name="influencerId"
          placeholder="UUID do influencer"
        />
      </div>

      <Campo
        rotulo="Link do Vídeo (opcional)"
        id="linkVideo"
        name="linkVideo"
        type="url"
        placeholder="https://drive.google.com/..."
      />

      <div className={s.acoes}>
        <Botao type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Cadastrar Corte'}
        </Botao>
      </div>
    </form>
  );
}
