import { describe, expect, it } from 'vitest';
import { aplicarSeed } from '../db/seed';
import { produtividadePorEditor } from '@/features/metricas/consultas';
import { periodoPadrao } from '@/features/metricas/periodo';
import { sqlTeste, usarBancoLimpo } from './helpers/db';

usarBancoLimpo();

describe('seed de demonstração', () => {
  it('toda Demanda em Em execução ou Pausada nasce com um Ciclo aberto', async () => {
    const sql = sqlTeste();
    await aplicarSeed(sql);

    const semCiclo = await sql<{ id: string }[]>`
      SELECT d.id FROM demands d
       WHERE d.deleted_at IS NULL
         AND d.editor_id IS NOT NULL
         AND d.status IN ('Em execução', 'Pausada')
         AND NOT EXISTS (SELECT 1 FROM editing_cycles c WHERE c.demand_id = d.id AND c.ended_at IS NULL)`;
    expect(semCiclo).toEqual([]);

    const pausadasSemPausa = await sql<{ id: string }[]>`
      SELECT d.id FROM demands d
       WHERE d.status = 'Pausada'
         AND NOT EXISTS (SELECT 1 FROM demand_pauses p WHERE p.demand_id = d.id AND p.resumed_at IS NULL)`;
    expect(pausadasSemPausa).toEqual([]);
  });

  it('o Ranking enxerga as Demandas em andamento do Editor do seed', async () => {
    const sql = sqlTeste();
    await aplicarSeed(sql);

    const linhas = await produtividadePorEditor(periodoPadrao());
    const editor = linhas.find((linha) => linha.nome === 'Editor Exemplo');
    // LFseed000002 e LFseed000010 em execução, LFseed000004 pausada.
    expect(editor?.emAndamento).toBe(3);
  });

  it('é idempotente: reaplicar não duplica Ciclos nem Pausas', async () => {
    const sql = sqlTeste();
    await aplicarSeed(sql);
    await aplicarSeed(sql);

    const [ciclos] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM editing_cycles`;
    const [pausas] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM demand_pauses`;
    expect(ciclos?.n).toBe(3);
    expect(pausas?.n).toBe(1);
  });
});
