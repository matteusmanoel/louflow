'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type { Demanda } from '../consultas';
import { criarDemanda, editarDemanda, excluirDemanda } from '../actions';
import { Aviso, Botao, Campo } from '@/components/ui';

type Opcao = { id: string; nome: string; label?: string };

type Props = {
  formatos: string[];
  editores: Opcao[];
  influencers: Opcao[];
  demanda?: Demanda;
  podeDefinirOutroEditor: boolean;
  podeExcluir: boolean;
};

const LINHAS_EDITORIAIS = ['Viral', 'Comunidade', 'Educacional'] as const;
const PRIORIDADES = ['Baixa', 'Normal', 'Alta', 'Urgente'] as const;

export function FormDemanda({
  formatos,
  editores,
  influencers,
  demanda,
  podeDefinirOutroEditor,
  podeExcluir,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'aviso'; texto: string } | null>(null);
  const [formato, setFormato] = useState(demanda?.format ?? '');
  const formRef = useRef<HTMLFormElement>(null);

  const ehCortes = formato === 'Cortes';
  const ehFicha = formato === 'Ficha técnica';
  const editando = Boolean(demanda);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = new FormData(form);

    const entrada = {
      ...(editando ? { id: demanda!.id } : {}),
      title: dados.get('title') as string,
      format: dados.get('format') as string,
      influencer_id: (dados.get('influencer_id') as string) || null,
      editor_id: (dados.get('editor_id') as string) || null,
      priority: dados.get('priority') as 'Baixa' | 'Normal' | 'Alta' | 'Urgente',
      approval_date: (dados.get('approval_date') as string) || null,
      post_date: (dados.get('post_date') as string) || null,
      info: (dados.get('info') as string) || null,
      link: (dados.get('link') as string) || null,
      editorial_line: ((dados.get('editorial_line') as string) || null) as 'Viral' | 'Comunidade' | 'Educacional' | null,
      source_program: (dados.get('source_program') as string) || null,
      clips_count: dados.get('clips_count') ? Number(dados.get('clips_count')) : null,
    };

    startTransition(async () => {
      const resultado = editando
        ? await editarDemanda(entrada)
        : await criarDemanda(entrada);

      if (resultado.ok) {
        router.push(editando ? `/demandas/${demanda!.id}` : `/demandas/${resultado.dados.id}`);
        router.refresh();
      } else {
        setMensagem({ tipo: 'erro', texto: resultado.mensagem });
      }
    });
  }

  async function handleExcluir() {
    if (!demanda) return;
    if (!confirm(`Mover "${demanda.title}" para a Lixeira?`)) return;

    startTransition(async () => {
      const resultado = await excluirDemanda({ id: demanda.id });
      if (resultado.ok) {
        router.push('/demandas');
        router.refresh();
      } else {
        setMensagem({ tipo: 'erro', texto: resultado.mensagem });
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => void handleSubmit(e)}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {mensagem && (
        <Aviso tipo={mensagem.tipo === 'erro' ? 'erro' : 'aviso'}>{mensagem.texto}</Aviso>
      )}

      <Campo
        rotulo="Título *"
        id="title"
        name="title"
        required
        defaultValue={demanda?.title ?? ''}
        maxLength={300}
        placeholder="Descreva a demanda"
      />

      {/* Formato */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--texto-forte)' }}>
          Formato *
        </span>
        <select
          name="format"
          required
          value={formato}
          onChange={(e) => setFormato(e.target.value)}
          style={{
            border: '1px solid var(--borda-app)',
            borderRadius: 'var(--raio-input)',
            padding: '8px 10px',
            fontSize: '0.875rem',
            background: 'var(--superficie)',
          }}
        >
          <option value="">Selecione…</option>
          {formatos.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>

      {ehCortes && (
        <Aviso tipo="aviso">
          Demandas de Cortes recebem o Editor padrão automaticamente e não podem ser assumidas da Fila.
        </Aviso>
      )}

      {/* Influencer */}
      {influencers.length > 0 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--texto-forte)' }}>
            Influencer
          </span>
          <select
            name="influencer_id"
            defaultValue={demanda?.influencer_id ?? ''}
            style={{
              border: '1px solid var(--borda-app)',
              borderRadius: 'var(--raio-input)',
              padding: '8px 10px',
              fontSize: '0.875rem',
              background: 'var(--superficie)',
            }}
          >
            <option value="">— Nenhum —</option>
            {influencers.map((i) => (
              <option key={i.id} value={i.id}>{i.nome}</option>
            ))}
          </select>
        </label>
      )}

      {/* Editor — oculto para Cortes (atribuído automaticamente) */}
      {!ehCortes && podeDefinirOutroEditor && editores.length > 0 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--texto-forte)' }}>
            Editor
            {ehFicha && <span style={{ color: 'var(--texto-suave)', fontWeight: 400 }}> (opcional — entra na Fila se vazio)</span>}
          </span>
          <select
            name="editor_id"
            defaultValue={demanda?.editor_id ?? ''}
            style={{
              border: '1px solid var(--borda-app)',
              borderRadius: 'var(--raio-input)',
              padding: '8px 10px',
              fontSize: '0.875rem',
              background: 'var(--superficie)',
            }}
          >
            <option value="">— A definir —</option>
            {editores.map((ed) => (
              <option key={ed.id} value={ed.id}>{ed.label ?? ed.nome}</option>
            ))}
          </select>
        </label>
      )}

      {/* Prioridade */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--texto-forte)' }}>Prioridade</span>
        <select
          name="priority"
          defaultValue={demanda?.priority ?? 'Normal'}
          style={{
            border: '1px solid var(--borda-app)',
            borderRadius: 'var(--raio-input)',
            padding: '8px 10px',
            fontSize: '0.875rem',
            background: 'var(--superficie)',
          }}
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Campo
          rotulo="Data para aprovação"
          id="approval_date"
          name="approval_date"
          type="date"
          defaultValue={demanda?.approval_date ?? ''}
        />
        <Campo
          rotulo="Data de postagem"
          id="post_date"
          name="post_date"
          type="date"
          defaultValue={demanda?.post_date ?? ''}
        />
      </div>

      <Campo
        rotulo="Link externo"
        id="link"
        name="link"
        type="url"
        placeholder="https://drive.google.com/…"
        defaultValue={demanda?.link ?? ''}
      />

      {/* Linha editorial e Programa (campos de Cortes) */}
      {ehCortes && (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--texto-forte)' }}>Linha Editorial</span>
            <select
              name="editorial_line"
              defaultValue={demanda?.editorial_line ?? ''}
              style={{
                border: '1px solid var(--borda-app)',
                borderRadius: 'var(--raio-input)',
                padding: '8px 10px',
                fontSize: '0.875rem',
                background: 'var(--superficie)',
              }}
            >
              <option value="">— Selecione —</option>
              {LINHAS_EDITORIAIS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <Campo
            rotulo="Programa de Origem"
            id="source_program"
            name="source_program"
            defaultValue={demanda?.source_program ?? ''}
          />
          <Campo
            rotulo="Quantidade de Cortes"
            id="clips_count"
            name="clips_count"
            type="number"
            min="1"
            max="999"
            defaultValue={demanda?.clips_count?.toString() ?? ''}
          />
        </>
      )}

      {/* Informações adicionais */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--texto-forte)' }}>Observações</span>
        <textarea
          name="info"
          defaultValue={demanda?.info ?? ''}
          maxLength={2000}
          rows={3}
          style={{
            border: '1px solid var(--borda-app)',
            borderRadius: 'var(--raio-input)',
            padding: '8px 10px',
            fontSize: '0.875rem',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </label>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <Botao type="submit" disabled={isPending}>
          {isPending ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar demanda'}
        </Botao>
        <Botao
          type="button"
          variante="neutro"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Botao>
        {editando && podeExcluir && (
          <Botao
            type="button"
            variante="neutro"
            onClick={() => void handleExcluir()}
            disabled={isPending}
            style={{ marginLeft: 'auto', color: 'var(--alerta-atrasada)', borderColor: 'var(--alerta-atrasada)' }}
          >
            Excluir
          </Botao>
        )}
      </div>
    </form>
  );
}
