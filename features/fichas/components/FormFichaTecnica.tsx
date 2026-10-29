'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mostrarFeedback } from '@/lib/toast';
import type { Resultado } from '@/lib/action';
import type { FichaTecnica } from '../consultas';
import { salvarFichaTecnica } from '../actions';

type Props = {
  demandaId: string;
  ficha: FichaTecnica | null;
};

type Estado = { mensagem: string; ok?: boolean } | null;

export function FormFichaTecnica({ demandaId, ficha }: Props) {
  const router = useRouter();
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
    if (resultado.ok) {
      mostrarFeedback(resultado);
      router.refresh();
      return null;
    }
    return { mensagem: resultado.mensagem, ok: false };
  };

  const [estado, dispatch, pendente] = useActionState(acao, null);

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {estado && !estado.ok && (
        <Alert variant="destructive">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="formato">Formato</Label>
          <Input
            id="formato"
            name="formato"
            type="text"
            maxLength={100}
            required
            defaultValue={ficha?.formato ?? ''}
            placeholder="Ex.: Reels, YouTube, TikTok"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duracaoSegundos">Duração (segundos)</Label>
          <Input
            id="duracaoSegundos"
            name="duracaoSegundos"
            type="number"
            min={1}
            required
            defaultValue={ficha?.duracaoSegundos ?? ''}
            placeholder="Ex.: 60"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="plataformas">Plataformas (separadas por vírgula)</Label>
        <Input
          id="plataformas"
          name="plataformas"
          type="text"
          required
          defaultValue={ficha?.plataformas.join(', ') ?? ''}
          placeholder="Ex.: Instagram, TikTok, YouTube"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="briefing">Briefing</Label>
        <Textarea
          id="briefing"
          name="briefing"
          required
          rows={5}
          maxLength={5000}
          defaultValue={ficha?.briefing ?? ''}
          placeholder="Descreva o briefing da produção…"
          className="resize-y min-h-[100px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoesTecnicas">
          Observações Técnicas{' '}
          <span className="text-[var(--texto-suave)] font-normal">(opcional)</span>
        </Label>
        <Textarea
          id="observacoesTecnicas"
          name="observacoesTecnicas"
          rows={3}
          maxLength={2000}
          defaultValue={ficha?.observacoesTecnicas ?? ''}
          placeholder="Observações adicionais para a equipe técnica…"
          className="resize-y min-h-[72px]"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pendente ? 'Salvando…' : 'Salvar Ficha Técnica'}
        </Button>
      </div>
    </form>
  );
}
