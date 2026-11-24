import postgres from 'postgres';
import { gerarHashPin, gerarPinProvisorio } from '../../lib/pin';
import {
  classificarDestinatario,
  enviarTextoPrivado,
  textoAcessoProvisorio,
  urlPublica,
  type ClasseDestinatario,
} from '../../features/notificacoes/acesso-provisorio';

/**
 * Uso:
 *   pnpm exec tsx --conditions=react-server scripts/virada/avisar-acesso.ts
 *   VIRADA_CONFIRMADA=sim pnpm exec tsx --conditions=react-server scripts/virada/avisar-acesso.ts --enviar
 *
 * Sem --enviar, só conta. Não imprime PIN, e-mail, telefone nem token.
 * Manda no privado de users.whatsapp. Não usa UAZAPI_DESTINO e não fala com o grupo.
 * Quem já tem PIN não recebe outro. Falha de envio não grava o hash.
 */

type Linha = {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  tem_pin: boolean;
  is_active: boolean;
};

const PAUSA_MS = 500;

function contar(linhas: Linha[]): Record<ClasseDestinatario, number> {
  const contagem: Record<ClasseDestinatario, number> = {
    elegivel: 0,
    inativo: 0,
    sintetico: 0,
    sem_whatsapp: 0,
    ja_tem_pin: 0,
    whatsapp_invalido: 0,
  };
  for (const linha of linhas) {
    const classe = classificarDestinatario({
      email: linha.email,
      whatsapp: linha.whatsapp,
      ativo: linha.is_active,
      temPin: linha.tem_pin,
    });
    contagem[classe] += 1;
  }
  return contagem;
}

async function main() {
  const enviar = process.argv.includes('--enviar');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Defina DATABASE_URL.');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const linhas = await sql<Linha[]>`
      SELECT id, name, email, whatsapp, pin_hash IS NOT NULL AS tem_pin, is_active
      FROM   users
    `;
    const contagem = contar(linhas);
    console.log(JSON.stringify({ modo: enviar ? 'enviar' : 'ensaio', ...contagem }));
    if (!enviar) return;

    if (process.env.VIRADA_CONFIRMADA !== 'sim') {
      throw new Error('Envio recusado: defina VIRADA_CONFIRMADA=sim.');
    }
    const acesso = urlPublica(process.env.APP_URL ?? '');
    const base = process.env.UAZAPI_BASE_URL ?? '';
    const token = process.env.UAZAPI_TOKEN ?? '';
    if (!base.trim() || !token.trim()) throw new Error('Envio recusado: a instância uazapi não está configurada.');

    const elegiveis = linhas.filter(
      (linha) =>
        classificarDestinatario({
          email: linha.email,
          whatsapp: linha.whatsapp,
          ativo: linha.is_active,
          temPin: linha.tem_pin,
        }) === 'elegivel',
    );
    let enviados = 0;
    let falhas = 0;
    for (const linha of elegiveis) {
      try {
        const gravou = await sql.begin(async (tx) => {
          const [travada] = await tx<{ id: string }[]>`
            SELECT id FROM users
            WHERE  id = ${linha.id} AND pin_hash IS NULL AND is_active
            FOR UPDATE
          `;
          if (!travada || !linha.whatsapp) return false;
          const pin = gerarPinProvisorio();
          const texto = textoAcessoProvisorio({
            nome: linha.name,
            url: acesso,
            email: linha.email,
            pin,
          });
          await enviarTextoPrivado({ base, token, numero: linha.whatsapp, texto });
          await tx`
            UPDATE users
            SET    pin_hash = ${await gerarHashPin(pin)}, must_reset_pin = true
            WHERE  id = ${linha.id}
          `;
          return true;
        });
        if (gravou) enviados += 1;
      } catch (erro) {
        falhas += 1;
        const mensagem = erro instanceof Error ? erro.message : 'falha';
        console.error(JSON.stringify({ falha: linha.id, mensagem }));
      }
      await new Promise((resolver) => setTimeout(resolver, PAUSA_MS));
    }
    console.log(JSON.stringify({ enviados, falhas }));
    if (falhas > 0) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : 'Falha no aviso de acesso');
  process.exit(1);
});
