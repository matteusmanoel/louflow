import { LIMITE_ARQUIVOS, ROTULO_TAMANHO_MAXIMO, TAMANHO_MAXIMO_BYTES, TIPOS_ARQUIVO, type TipoArquivo } from '@/lib/armazenamento-chave';

export type DescricaoArquivo = {
  name: string;
  type: string;
  size: number;
};

export type ArquivoPendente = {
  id: string;
  nome: string;
  tipo: TipoArquivo;
  tamanho: number;
  arquivo: Blob;
};

function tipoAceito(tipo: string): tipo is TipoArquivo {
  return (TIPOS_ARQUIVO as readonly string[]).includes(tipo);
}

/** O navegador às vezes não informa o MIME de HEIC. A extensão resolve nesses casos. */
export function resolverTipoArquivo(nome: string, tipo: string): TipoArquivo | null {
  if (tipoAceito(tipo)) return tipo;
  const semMime = tipo === '' || tipo === 'application/octet-stream';
  if (!semMime) return null;
  const extensao = nome.split('.').pop()?.toLowerCase();
  if (extensao === 'heic' || extensao === 'heif') return 'image/heic';
  return null;
}

/** Valida a seleção local. Não produz URL nem fala com o bucket. */
export function selecionarArquivos(
  atuais: number,
  entrada: readonly DescricaoArquivo[],
): { indices: number[]; tipos: TipoArquivo[]; erros: string[] } {
  if (entrada.length === 0) return { indices: [], tipos: [], erros: [] };
  if (atuais + entrada.length > LIMITE_ARQUIVOS) {
    return { indices: [], tipos: [], erros: [`São permitidos até ${LIMITE_ARQUIVOS} arquivos.`] };
  }

  const indices: number[] = [];
  const tipos: TipoArquivo[] = [];
  const erros: string[] = [];
  entrada.forEach((arquivo, indice) => {
    const tipo = resolverTipoArquivo(arquivo.name, arquivo.type);
    if (!tipo) {
      erros.push(`Tipo de arquivo não aceito: ${arquivo.name}.`);
      return;
    }
    if (arquivo.size <= 0 || arquivo.size > TAMANHO_MAXIMO_BYTES) {
      erros.push(`${arquivo.name} passa de ${ROTULO_TAMANHO_MAXIMO}.`);
      return;
    }
    indices.push(indice);
    tipos.push(tipo);
  });
  return { indices, tipos, erros };
}
