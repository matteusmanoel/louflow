import { Zip, ZipPassThrough } from 'fflate';

export const LIMITE_ZIP_BYTES = 512 * 1024 * 1024;
export const LIMITE_ZIP_ARQUIVOS = 100;
export const MSG_ZIP = 'A seleção passa de 512 MB ou de 100 arquivos. Baixe os arquivos individualmente.';
export const MSG_ZIP_VAZIO = 'Não há arquivos para baixar.';

export function avaliarVolumeZip(arquivos: readonly { tamanho: number }[]): string | null {
  if (arquivos.length === 0) return MSG_ZIP_VAZIO;
  if (arquivos.length > LIMITE_ZIP_ARQUIVOS) return MSG_ZIP;
  const total = arquivos.reduce((soma, arquivo) => soma + arquivo.tamanho, 0);
  if (total > LIMITE_ZIP_BYTES) return MSG_ZIP;
  return null;
}

type Entrada = { nome: string; abrir: () => Promise<AsyncIterable<Uint8Array>> };

class Fila {
  private itens: (Uint8Array | Error | null)[] = [];
  private espera: (() => void)[] = [];
  private alivio: (() => void)[] = [];

  colocar(item: Uint8Array | Error | null) {
    this.itens.push(item);
    const espera = this.espera.splice(0);
    for (const acordar of espera) acordar();
  }

  async tirar(): Promise<Uint8Array | Error | null> {
    while (this.itens.length === 0) {
      await new Promise<void>((resolve) => this.espera.push(resolve));
    }
    const item = this.itens.shift() ?? null;
    if (this.itens.length < 2) {
      const alivio = this.alivio.splice(0);
      for (const acordar of alivio) acordar();
    }
    return item;
  }

  async cheia() {
    if (this.itens.length < 4) return;
    await new Promise<void>((resolve) => this.alivio.push(resolve));
  }
}

/** Zip em fluxo. Os arquivos já comprimidos seguem sem nova compressão. */
export function compactar(entradas: readonly Entrada[]): ReadableStream<Uint8Array> {
  const fila = new Fila();
  let cancelado = false;
  const zip = new Zip((erro, dados, fim) => {
    if (erro) {
      fila.colocar(erro instanceof Error ? erro : new Error('Não foi possível compactar os arquivos.'));
      return;
    }
    if (dados.byteLength > 0) fila.colocar(dados);
    if (fim) fila.colocar(null);
  });

  const produzir = (async () => {
    for (const entrada of entradas) {
      if (cancelado) return;
      const arquivo = new ZipPassThrough(entrada.nome);
      zip.add(arquivo);
      let enviou = false;
      const corpo = await entrada.abrir();
      for await (const parte of corpo) {
        if (cancelado) return;
        const copia = parte.byteLength === parte.buffer.byteLength ? parte : new Uint8Array(parte);
        arquivo.push(copia, false);
        enviou = true;
        await fila.cheia();
      }
      arquivo.push(new Uint8Array(), true);
      if (!enviou) await fila.cheia();
    }
    zip.end();
  })().catch((erro: unknown) => {
    fila.colocar(erro instanceof Error ? erro : new Error('Não foi possível compactar os arquivos.'));
  });
  void produzir;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const item = await fila.tirar();
      if (item instanceof Error) {
        controller.error(item);
        return;
      }
      if (item === null) {
        controller.close();
        return;
      }
      controller.enqueue(item);
    },
    cancel() {
      cancelado = true;
      zip.terminate();
      fila.colocar(null);
    },
  });
}
