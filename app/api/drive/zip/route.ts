import { NextResponse } from 'next/server';
import { coletarZip } from '@/features/drive/dominio';
import { schemaZip } from '@/features/drive/schema';
import { avaliarVolumeZip, compactar } from '@/features/drive/zip';
import { lerObjeto } from '@/lib/armazenamento';
import { obterSessao } from '@/lib/auth';
import { db } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const usuario = await obterSessao();
  if (!usuario || usuario.perfil === 'Premios' || usuario.deveTrocarPin) {
    return NextResponse.json({ ok: false, mensagem: 'Sua sessão expirou. Entre novamente.' }, { status: 401 });
  }

  const bruto = await req.json().catch(() => null);
  const validado = schemaZip.safeParse(bruto);
  if (!validado.success) {
    return NextResponse.json(
      { ok: false, mensagem: validado.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    const arquivos = await coletarZip(db(), usuario, validado.data.ids);
    const erro = avaliarVolumeZip(arquivos);
    if (erro) return NextResponse.json({ ok: false, mensagem: erro }, { status: 400 });
    const stream = compactar(
      arquivos.map((arquivo) => ({
        nome: arquivo.nome,
        abrir: async () => {
          const corpo = await lerObjeto(arquivo.url);
          if (!corpo) throw new ErroDominio('Não foi possível baixar um dos arquivos.');
          return corpo;
        },
      })),
    );
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="drive.zip"',
      },
    });
  } catch (erro) {
    const mensagem = erro instanceof ErroDominio ? erro.message : 'Não foi possível baixar os arquivos.';
    return NextResponse.json({ ok: false, mensagem }, { status: 400 });
  }
}
