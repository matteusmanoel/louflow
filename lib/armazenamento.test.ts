import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const provedor = vi.hoisted(() => vi.fn((opcoes: { roleArn: string; audience?: string }) => ({ marca: 'oidc', opcoes })));
vi.mock('@vercel/oidc-aws-credentials-provider', () => ({ awsCredentialsProvider: provedor }));

import { env } from '@/lib/env';
import { AUDIENCIA_OIDC_AWS, opcoesCliente } from '@/lib/armazenamento';

const VARIAVEIS = ['S3_BUCKET', 'AWS_REGION', 'AWS_DEFAULT_REGION', 'AWS_ROLE_ARN'] as const;
const originais = new Map<string, string | undefined>();

beforeEach(() => {
  provedor.mockClear();
  for (const nome of VARIAVEIS) {
    originais.set(nome, process.env[nome]);
    delete process.env[nome];
  }
});

afterEach(() => {
  for (const nome of VARIAVEIS) {
    const valor = originais.get(nome);
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }
});

describe('cliente S3', () => {
  it('sem AWS_ROLE_ARN mantém a cadeia padrão de credenciais', () => {
    const opcoes = opcoesCliente('us-east-1', null);
    expect(opcoes.region).toBe('us-east-1');
    expect(opcoes.credentials).toBeUndefined();
    expect(provedor).not.toHaveBeenCalled();
  });

  it('com AWS_ROLE_ARN usa as credenciais OIDC do Vercel', () => {
    const arn = 'arn:aws:iam::123456789012:role/louflow-preview-s3';
    const opcoes = opcoesCliente('us-east-1', arn);
    expect(provedor).toHaveBeenCalledWith({ roleArn: arn, audience: AUDIENCIA_OIDC_AWS });
    expect(opcoes.credentials).toBeDefined();
    expect(opcoes.requestChecksumCalculation).toBe('WHEN_REQUIRED');
  });
});

describe('configuração de armazenamento no ambiente', () => {
  it('sem S3_BUCKET o armazenamento fica desligado, mesmo com AWS_ROLE_ARN', () => {
    process.env.AWS_ROLE_ARN = 'arn:aws:iam::123456789012:role/x';
    expect(env.armazenamento).toBeNull();
  });

  it('lê bucket, região e role; role ausente ou vazia vira null', () => {
    process.env.S3_BUCKET = 'bucket-teste';
    process.env.AWS_REGION = 'us-east-1';
    expect(env.armazenamento).toEqual({ bucket: 'bucket-teste', regiao: 'us-east-1', roleArn: null });
    process.env.AWS_ROLE_ARN = '  ';
    expect(env.armazenamento?.roleArn).toBeNull();
    process.env.AWS_ROLE_ARN = ' arn:aws:iam::123456789012:role/x ';
    expect(env.armazenamento?.roleArn).toBe('arn:aws:iam::123456789012:role/x');
  });
});
