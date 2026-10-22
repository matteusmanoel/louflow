import Link from 'next/link';
import { exigirModulo } from '@/lib/auth';
import { Titulo, Botao, Cartao } from '@/components/ui';
import { listarCaptacoesDb } from '@/features/captacoes/consultas';
import { TabelaCaptacoes } from '@/features/captacoes/components/TabelaCaptacoes';

export default async function PaginaCaptacoes() {
  const usuario = await exigirModulo('captacoes');
  const captacoes = await listarCaptacoesDb(usuario);

  return (
    <main style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <Titulo sobre="Recursos">Captações</Titulo>
        {usuario.permissoes.gerenciarCaptacoes && (
          <Link href="/captacoes/nova">
            <Botao>Nova Captação</Botao>
          </Link>
        )}
      </div>

      <Cartao>
        <TabelaCaptacoes captacoes={captacoes} podeGerenciar={usuario.permissoes.gerenciarCaptacoes} />
      </Cartao>
    </main>
  );
}
