import { describe, expect, it } from 'vitest';
import { ehEndpointProibido, ENDPOINTS_PROIBIDOS, validarDestinoSeed } from '../db/seed-guard';

const HOST_DEV = 'ep-exemplo-dev-aaaa1111.c-2.sa-east-1.aws.neon.tech';
const HOST_PROD = `${ENDPOINTS_PROIBIDOS[0]}.c-2.sa-east-1.aws.neon.tech`;
const url = (host: string) => `postgresql://usuario:segredo@${host}/banco?sslmode=require`;
const optIn = (hosts: string) => ({ SEED_ALLOW_REMOTE: '1', SEED_REMOTE_HOSTS: hosts });

describe('guard do seed', () => {
  it('aceita localhost e 127.0.0.1 sem opt-in', () => {
    expect(validarDestinoSeed('postgres://louflow:louflow@localhost:54329/louflow_test')).toBe('localhost');
    expect(validarDestinoSeed('postgres://louflow:louflow@127.0.0.1:54329/louflow_test')).toBe('127.0.0.1');
  });

  it('recusa host remoto por padrão, mesmo listado, sem SEED_ALLOW_REMOTE=1', () => {
    expect(() => validarDestinoSeed(url(HOST_DEV), {})).toThrow(/não aponta para localhost/);
    expect(() => validarDestinoSeed(url(HOST_DEV), { SEED_REMOTE_HOSTS: HOST_DEV })).toThrow(/não aponta para localhost/);
    expect(() => validarDestinoSeed(url(HOST_DEV), { SEED_ALLOW_REMOTE: 'true', SEED_REMOTE_HOSTS: HOST_DEV })).toThrow();
  });

  it('com opt-in, aceita só o host remoto exato da lista', () => {
    expect(validarDestinoSeed(url(HOST_DEV), optIn(`outro.exemplo.test, ${HOST_DEV}`))).toBe(HOST_DEV);
    expect(() => validarDestinoSeed(url(HOST_DEV), optIn(''))).toThrow(/SEED_REMOTE_HOSTS/);
    expect(() => validarDestinoSeed(url(HOST_DEV), optIn('outro.exemplo.test'))).toThrow(/SEED_REMOTE_HOSTS/);
    expect(() => validarDestinoSeed(url(`x${HOST_DEV}`), optIn(HOST_DEV))).toThrow(/SEED_REMOTE_HOSTS/);
  });

  it('recusa SEMPRE o endpoint de produção, com ou sem pooler e mesmo listado', () => {
    const [id] = ENDPOINTS_PROIBIDOS;
    for (const host of [HOST_PROD, `${id}-pooler.c-2.sa-east-1.aws.neon.tech`, `${id}-xbv.c-2.sa-east-1.aws.neon.tech`, HOST_PROD.toUpperCase()]) {
      expect(ehEndpointProibido(host)).toBe(true);
      expect(() => validarDestinoSeed(url(host), optIn(host))).toThrow(/produção/);
      expect(() => validarDestinoSeed(url(host), {})).toThrow(/produção/);
    }
  });

  it('não confunde endpoint parecido com o de produção', () => {
    expect(ehEndpointProibido(`${ENDPOINTS_PROIBIDOS[0]}9.c-2.sa-east-1.aws.neon.tech`)).toBe(false);
    expect(ehEndpointProibido(HOST_DEV)).toBe(false);
  });

  it('recusa URL inválida e não vaza a senha na mensagem', () => {
    expect(() => validarDestinoSeed('nao-e-url')).toThrow(/inválida/);
    try {
      validarDestinoSeed(url(HOST_DEV), {});
    } catch (erro) {
      expect(String(erro)).not.toContain('segredo');
      expect(String(erro)).not.toContain(HOST_DEV);
    }
  });
});
