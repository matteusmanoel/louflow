import Image from 'next/image';
import { exigirModulo } from '@/lib/auth';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { CATALOGO } from '@/features/equipamentos/catalogo';

export const dynamic = 'force-dynamic';

export default async function PaginaEquipamentos() {
  await exigirModulo('equipamentos');

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Recursos"
        titulo="Catálogo de Equipamentos"
        descricao="Referência visual do que o time tem disponível. Somente leitura."
      />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOGO.map((item) => (
          <li
            key={item.arquivo}
            className="overflow-hidden rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)]"
          >
            <div className="relative aspect-[4/3] bg-[var(--fundo-app)]">
              <Image
                src={`/equipamentos/${item.arquivo}`}
                alt={item.rotulo}
                fill
                sizes="(max-width: 650px) 100vw, 33vw"
                className="object-contain"
              />
            </div>
            <p className="px-3 py-2 text-sm font-medium text-[var(--texto-forte)]">{item.rotulo}</p>
          </li>
        ))}
      </ul>
    </ContainerPagina>
  );
}
