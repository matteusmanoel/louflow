import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { registrarErro, sanitizarMensagem } from '@/lib/error-log';

const schema = z.object({
  mensagem: z.string().min(1).max(2000),
  contexto: z.string().max(500).optional(),
  stack: z.string().max(3000).optional(),
});

/**
 * POST /api/erros
 * Registra erros do cliente sem exigir sessão.
 * Sanitiza mensagem/stack antes de persistir (sem PII).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, mensagem: 'JSON inválido.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, mensagem: 'Dados inválidos.' }, { status: 400 });
  }

  const { mensagem, contexto, stack } = parsed.data;
  const detalhes = [contexto ? `contexto: ${sanitizarMensagem(contexto)}` : null, stack ? `stack: ${sanitizarMensagem(stack, 1000)}` : null]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1000) || null;

  try {
    await registrarErro(db(), 'cliente', mensagem, detalhes ?? undefined);
  } catch {
    // Falha silenciosa — nunca retorna erro interno para o cliente
  }

  return NextResponse.json({ ok: true });
}
