import { describe, expect, it, vi } from 'vitest';
import { paraDtoTv } from '@/lib/tv';
import { registrarHistorico } from '@/lib/history';
import { criarUsuario, sqlTeste, usarBancoLimpo } from './helpers/db';

const sessao = vi.hoisted(() => ({ atual: null as null | { id: string } }));
vi.mock('@/lib/auth', () => ({ obterSessao: async () => sessao.atual }));

usarBancoLimpo();

const cron = async (job: string, auth?: string) => {
  sqlTeste();
  const { POST } = await import('@/app/api/cron/[job]/route');
  const req = new Request(`http://localhost/api/cron/${job}`, { method: 'POST', headers: auth ? { authorization: auth } : {} });
  return POST(req, { params: Promise.resolve({ job }) });
};

describe('/api/cron/[job]', () => {
  it('401 sem segredo ou com segredo errado', async () => {
    expect((await cron('encerramentos')).status).toBe(401);
    expect((await cron('encerramentos', 'Bearer errado')).status).toBe(401);
  });

  it('404 para job desconhecido', async () => {
    expect((await cron('nao-existe', 'Bearer segredo-de-teste')).status).toBe(404);
  });

  it('200 executa todos os handlers do job', async () => {
    const r = await cron('encerramentos', 'Bearer segredo-de-teste');
    expect(r.status).toBe(200);
    const { resultados } = (await r.json()) as { resultados: { handler: string }[] };
    expect(resultados.map((x) => x.handler)).toEqual(['encerrarCaptacoesVencidas', 'finalizarReservasVencidas']);
  });
});

describe('/api/sync', () => {
  it('401 sem Sessão', async () => {
    sessao.atual = null;
    const { GET } = await import('@/app/api/sync/route');
    expect((await GET(new Request('http://localhost/api/sync'))).status).toBe(401);
  });

  it('revisão muda quando há Histórico novo', async () => {
    const u = await criarUsuario();
    sessao.atual = { id: u.id };
    const { GET } = await import('@/app/api/sync/route');
    const r1 = await (await GET(new Request('http://localhost/api/sync?desde=0'))).json();
    await registrarHistorico(sqlTeste(), { demandaId: null, acao: 'teste', usuarioId: u.id });
    const r2 = await (await GET(new Request(`http://localhost/api/sync?desde=${r1.revisao}`))).json();
    expect(r2).toMatchObject({ alterou: true });
    const r3 = await (await GET(new Request(`http://localhost/api/sync?desde=${r2.revisao}`))).json();
    expect(r3).toMatchObject({ alterou: false });
  });
});

describe('/api/tv', () => {
  it('responde com cache de borda de 15 s', async () => {
    sqlTeste();
    const { GET } = await import('@/app/api/tv/route');
    const r = await GET();
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('public, s-maxage=15, stale-while-revalidate=30');
  });

  it('DTO descarta qualquer campo fora da lista branca', () => {
    const vazar = { email: 'x@exemplo.test', pin_hash: 'h', link: 'https://drive', motivo: 'm' };
    const dto = paraDtoTv({
      resumoMes: { criadas: 1, concluidas: 0, emAndamento: 1, atrasadas: 0, ...vazar },
      demandasPendentes: [{ id: 'LF1', titulo: 't', formato: 'Reels', editor: null, influencer: null, status: 's', prioridade: 'Normal', prazo: null, ...vazar }],
      aprovacoes: [{ demandaId: 'LF1', titulo: 't', editor: null, influencer: null, versao: 1, desde: new Date(), ...vazar }],
      agenda: [{ titulo: 't', marca: 'm', plataforma: 'p', quando: new Date(), situacao: 's', ...vazar }],
      captacoes: [{ inicio: new Date(), fim: new Date(), videomaker: 'v', cliente: null, assunto: null, local: null, ...vazar }],
      cortes: [{ titulo: 't', linhaEditorial: 'Viral', programa: 'p', dataPostagem: '2026-11-10', situacao: 's', ...vazar }],
    });
    const json = JSON.stringify(dto);
    for (const proibido of ['email', 'pin_hash', 'drive', 'motivo']) expect(json).not.toContain(proibido);
  });
});
