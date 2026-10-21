/**
 * S1-09 (#11564): Painel de TV público em carrossel, alimentado por polling de /api/tv.
 * Identidade visual própria (docs/design-tokens.md §6): não importar tokens da interface principal.
 */
export default function PainelTv() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0A0F18', color: '#EEF1F5', fontFamily: 'sans-serif' }}>
      Painel de TV em construção.
    </main>
  );
}
