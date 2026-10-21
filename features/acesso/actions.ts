'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { criarAcao } from '@/lib/action';
import { registrarAuditoria } from '@/lib/audit';
import { COOKIE_DISPOSITIVO, COOKIE_SESSAO, gravarCookieDispositivo, gravarCookieSessao, limparCookies } from '@/lib/auth';
import { db, emTransacao } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import { FORMATO_PIN } from '@/lib/pin';
import { autenticar, criarDispositivoConfiavel, criarSessao, encerrarSessao, esquecerDispositivo, trocarPinProprio } from '@/lib/session';

/** [PROTEGIDO] Login, troca de PIN e saída. */

export type EstadoFormulario = { mensagem: string } | null;

const MENSAGEM_INVALIDO = 'E-mail ou PIN inválido.';

const schemaLogin = z.object({
  email: z.string().trim().email(MENSAGEM_INVALIDO).max(254),
  pin: z.string().regex(FORMATO_PIN, MENSAGEM_INVALIDO),
  lembrar: z.boolean(),
  para: z.string().optional(),
});

function destinoSeguro(valor: string | undefined): string {
  return valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/';
}

export async function entrar(_anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const entrada = schemaLogin.safeParse({
    email: form.get('email'),
    pin: form.get('pin'),
    lembrar: form.get('lembrar') === 'on',
    para: form.get('para') ?? undefined,
  });
  if (!entrada.success) return { mensagem: MENSAGEM_INVALIDO };

  const { email, pin, lembrar, para } = entrada.data;
  const resultado = await emTransacao((tx) => autenticar(tx, email, pin));
  if (!resultado.ok) {
    if (resultado.motivo === 'bloqueado') {
      const minutos = Math.max(1, Math.ceil((resultado.liberaEm.getTime() - Date.now()) / 60000));
      return { mensagem: `Acesso bloqueado por excesso de tentativas. Tente novamente em ${minutos} min.` };
    }
    return { mensagem: MENSAGEM_INVALIDO };
  }

  const sessao = await criarSessao(db(), resultado.userId);
  await gravarCookieSessao(sessao);
  if (lembrar && !resultado.deveTrocarPin) {
    await gravarCookieDispositivo(await criarDispositivoConfiavel(db(), resultado.userId));
  }
  redirect(resultado.deveTrocarPin ? '/trocar-pin' : destinoSeguro(para));
}

const acaoTrocarPin = criarAcao({
  nome: 'trocarPin',
  permitirPinProvisorio: true,
  schema: z
    .object({
      pin: z.string().regex(FORMATO_PIN, 'O PIN deve ter 6 dígitos.'),
      confirmacao: z.string(),
    })
    .refine((v) => v.pin === v.confirmacao, { message: 'A confirmação não confere com o novo PIN.' }),
  executar: async ({ tx, usuario, entrada }) => {
    if (/^(\d)\1{5}$/.test(entrada.pin) || '0123456789'.includes(entrada.pin) || '9876543210'.includes(entrada.pin)) {
      throw new ErroDominio('Escolha um PIN menos previsível.');
    }
    await trocarPinProprio(tx, usuario.id, entrada.pin);
    await registrarAuditoria(tx, { acao: 'PIN alterado pelo próprio Usuário', usuarioId: usuario.id, alvo: usuario.id });
    return { dados: { token: await criarSessao(tx, usuario.id) }, mensagem: 'PIN atualizado.' };
  },
});

export async function trocarPin(_anterior: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const resultado = await acaoTrocarPin({ pin: form.get('pin'), confirmacao: form.get('confirmacao') });
  if (!resultado.ok) return { mensagem: resultado.mensagem };
  await gravarCookieSessao(resultado.dados.token);
  redirect('/');
}

export async function sair(): Promise<void> {
  const jar = await cookies();
  const sessao = jar.get(COOKIE_SESSAO)?.value;
  const dispositivo = jar.get(COOKIE_DISPOSITIVO)?.value;
  if (sessao) await encerrarSessao(db(), sessao);
  if (dispositivo) await esquecerDispositivo(db(), dispositivo);
  await limparCookies();
  redirect('/login');
}
