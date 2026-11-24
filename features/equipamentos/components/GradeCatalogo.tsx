import Image from 'next/image';
import { CATALOGO } from '../catalogo';

/** Grade somente leitura do catálogo. A Wiki a mostra; a rota antiga só redireciona. */
export function GradeCatalogo() {
  return (
    <section
      aria-labelledby="catalogo-equipamentos-titulo"
      className="grid min-w-0 gap-4 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-5 shadow-[var(--sombra-card)]"
    >
      <header className="grid min-w-0 gap-1">
        <h2 id="catalogo-equipamentos-titulo" className="text-xl font-semibold text-[var(--texto-forte)]">
          Catálogo de Equipamentos
        </h2>
        <p className="text-sm text-[var(--texto-suave)]">
          Referência visual do que o time tem disponível. Somente leitura.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
    </section>
  );
}
