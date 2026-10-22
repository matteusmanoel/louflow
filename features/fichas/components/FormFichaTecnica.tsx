'use client';

import { useActionState } from 'react';
import { Campo, Botao, Aviso } from '@/components/ui';
import type { Resultado } from '@/lib/action';
import type { FichaTecnica } from '../consultas';
import { salvarFichaTecnica } from '../actions';

type Props = {
  demandaId: string;
  ficha: FichaTecnica | null;
};

type Estado = { mensagem: string; ok?: boolean } | null;

export function FormFichaTecnica({ demandaId, ficha }: Props) {
  const acao = async (_anterior: Estado, form: FormData): Promise<Estado> => {
    const plataformasStr = (form.get('plataformas') as string) ?? '';
    const plataformas = plataformasStr
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const duracaoStr = form.get('duracaoSegundos') as string;
    const duracaoSegundos = parseInt(duracaoStr, 10);

    const entrada = {
      demandaId,
      formato: (form.get('formato') as string) ?? '',
      duracaoSegundos: isNaN(duracaoSegundos) ? 0 : duracaoSegundos,
      plataformas,
      briefing: (form.get('briefing') as string) ?? '',
      observacoesTecnicas: (form.get('observacoesTecnicas') as string) || undefined,
    };

    const resultado: Resultado<{ demandaId: string }> = await salvarFichaTecnica(entrada);
    return { mensagem: resultado.mensagem, ok: resultado.ok };
  };

  const [estado, dispatch, pendente] = useActionState(acao, null);

  return (
    <form action={dispatch} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {estado && (
        <Aviso tipo={estado.ok ? 'aviso' : 'erro'}>{estado.mensagem}</Aviso>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Campo
          rotulo="Formato"
          id="formato"
          name="formato"
          type="text"
          maxLength={100}
          required
          defaultValue={ficha?.formato ?? ''}
          placeholder="Ex.: Reels, YouTube, TikTok"
        />
        <Campo
          rotulo="Duração (segundos)"
          id="duracaoSegundos"
          name="duracaoSegundos"
          type="number"
          min={1}
          required
          defaultValue={ficha?.duracaoSegundos ?? ''}
          placeholder="Ex.: 60"
        />
      </div>

      <Campo
        rotulo="Plataformas (separadas por vírgula)"
        id="plataformas"
        name="plataformas"
        type="text"
        required
        defaultValue={ficha?.plataformas.join(', ') ?? ''}
        placeholder="Ex.: Instagram, TikTok, YouTube"
      />

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--texto-suave)',
          }}
        >
          Briefing
        </span>
        <textarea
          name="briefing"
          id="briefing"
          required
          rows={5}
          maxLength={5000}
          defaultValue={ficha?.briefing ?? ''}
          placeholder="Descreva o briefing da produção…"
          style={{
            borderRadius: 'var(--raio-input)',
            border: '1px solid var(--borda-app)',
            background: 'var(--superficie)',
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--texto-forte)',
            resize: 'vertical',
            minHeight: 100,
          }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--texto-suave)',
          }}
        >
          Observações Técnicas <span style={{ fontWeight: 400, color: 'var(--texto-suave)' }}>(opcional)</span>
        </span>
        <textarea
          name="observacoesTecnicas"
          id="observacoesTecnicas"
          rows={3}
          maxLength={2000}
          defaultValue={ficha?.observacoesTecnicas ?? ''}
          placeholder="Observações adicionais para a equipe técnica…"
          style={{
            borderRadius: 'var(--raio-input)',
            border: '1px solid var(--borda-app)',
            background: 'var(--superficie)',
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--texto-forte)',
            resize: 'vertical',
            minHeight: 72,
          }}
        />
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar Ficha Técnica'}
        </Botao>
      </div>
    </form>
  );
}
