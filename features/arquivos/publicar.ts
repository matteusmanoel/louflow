import type { ItemArquivo } from './schema';
import type { ArquivoPendente } from './selecao';

type ResultadoEnvio =
  | { ok: true; item: ItemArquivo }
  | { ok: false; mensagem: string; urlParcial?: string };

/**
 * Envia o cache local e só então grava a Demanda, a Entrega ou o Corte.
 * Falha no envio ou na gravação descarta os objetos desta tentativa.
 * Cancelar não chama esta função: o cache some com o formulário.
 */
export async function publicarArquivos<T extends { ok: boolean; mensagem: string }>(opcoes: {
  pendentes: readonly ArquivoPendente[];
  enviar: (pendente: ArquivoPendente) => Promise<ResultadoEnvio>;
  descartar: (urls: readonly string[]) => Promise<void>;
  persistir: (arquivos: ItemArquivo[]) => Promise<T>;
  aoProgresso?: (atual: number, total: number) => void;
}): Promise<T | { ok: false; mensagem: string }> {
  if (opcoes.pendentes.length === 0) return opcoes.persistir([]);

  const enviados: ItemArquivo[] = [];
  const descartar = async (extras: string[] = []) => {
    const urls = [...enviados.map((item) => item.url), ...extras];
    if (urls.length === 0) return;
    try {
      await opcoes.descartar(urls);
    } catch {
      // A limpeza não substitui o erro que o usuário precisa ver.
    }
  };

  try {
    for (let indice = 0; indice < opcoes.pendentes.length; indice += 1) {
      opcoes.aoProgresso?.(indice + 1, opcoes.pendentes.length);
      const resultado = await opcoes.enviar(opcoes.pendentes[indice]!);
      if (!resultado.ok) {
        await descartar(resultado.urlParcial ? [resultado.urlParcial] : []);
        return { ok: false, mensagem: resultado.mensagem };
      }
      enviados.push(resultado.item);
    }

    const gravado = await opcoes.persistir(enviados);
    if (!gravado.ok) await descartar();
    return gravado;
  } catch {
    await descartar();
    return { ok: false, mensagem: 'Não foi possível enviar os arquivos. Tente novamente.' };
  }
}
