import { Button } from '@/components/ui/button';

export function ListaLinksArquivo({ arquivos }: { arquivos: { id: string; nome: string; url: string }[] }) {
  if (arquivos.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {arquivos.map((arquivo) => (
        <li key={arquivo.id}>
          <Button variant="outline" size="sm" asChild>
            <a href={arquivo.url} target="_blank" rel="noopener noreferrer">
              {arquivo.nome}
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}
