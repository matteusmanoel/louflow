import { describe, expect, it, vi } from 'vitest';
import {
  classificarDestinatario,
  enviarTextoPrivado,
  textoAcessoProvisorio,
  urlPublica,
} from './acesso-provisorio';

const ativo = { email: 'ada@loumar.com.br', whatsapp: '5545999990000', ativo: true, temPin: false };

describe('acesso provisório da virada', () => {
  it('classifica quem pode receber no privado', () => {
    expect(classificarDestinatario(ativo)).toBe('elegivel');
    expect(classificarDestinatario({ ...ativo, ativo: false })).toBe('inativo');
    expect(classificarDestinatario({ ...ativo, email: 'admin@exemplo.test' })).toBe('sintetico');
    expect(classificarDestinatario({ ...ativo, temPin: true })).toBe('ja_tem_pin');
    expect(classificarDestinatario({ ...ativo, whatsapp: null })).toBe('sem_whatsapp');
    expect(classificarDestinatario({ ...ativo, whatsapp: '5545999990000@g.us' })).toBe('whatsapp_invalido');
  });

  it('recusa URL local e aceita a pública', () => {
    expect(urlPublica('https://louflow.vercel.app/login')).toBe('https://louflow.vercel.app');
    expect(() => urlPublica('http://louflow.vercel.app')).toThrow(/https/);
    expect(() => urlPublica('https://localhost:3000')).toThrow(/local/);
    expect(() => urlPublica('https://app.exemplo.test')).toThrow(/local/);
  });

  it('monta a mensagem padrão com link, usuário e PIN', () => {
    const texto = textoAcessoProvisorio({
      nome: 'Ada',
      url: 'https://louflow.vercel.app',
      email: 'ada@loumar.com.br',
      pin: '482916',
    });
    expect(texto).toContain('Acesse: https://louflow.vercel.app');
    expect(texto).toContain('Usuário: ada@loumar.com.br');
    expect(texto).toContain('PIN provisório: 482916');
    expect(texto).toContain('Não encaminhe esta mensagem.');
    expect(texto).not.toContain('@g.us');
  });

  it('envia só para o número privado e não devolve o texto no erro', async () => {
    const buscar = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    await enviarTextoPrivado({
      base: 'https://instancia.exemplo',
      token: 'segredo',
      numero: '5545999990000',
      texto: 'PIN provisório: 482916',
      buscar,
    });
    const [endereco, init] = buscar.mock.calls[0] ?? [];
    expect(String(endereco)).toBe('https://instancia.exemplo/send/text');
    const corpo = JSON.parse(String(init?.body));
    expect(corpo.number).toBe('5545999990000');
    expect(corpo.number).not.toContain('@g.us');

    const falha = vi.fn<typeof fetch>(async () => new Response('PIN provisório: 482916', { status: 500 }));
    await expect(
      enviarTextoPrivado({
        base: 'https://instancia.exemplo',
        token: 'segredo',
        numero: '5545999990000',
        texto: 'PIN provisório: 482916',
        buscar: falha,
      }),
    ).rejects.toThrow('uazapi respondeu 500');
    await expect(
      enviarTextoPrivado({
        base: 'https://instancia.exemplo',
        token: 'segredo',
        numero: '120363000@g.us',
        texto: 'oi',
        buscar,
      }),
    ).rejects.toThrow(/privado/);
  });
});
