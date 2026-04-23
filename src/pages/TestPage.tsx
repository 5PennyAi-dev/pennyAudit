export function TestPage() {
  return (
    <main className="min-h-screen bg-navy-600 font-sans flex items-center justify-center px-8">
      <div className="flex flex-col items-center gap-8 text-center">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">
          /test · sanity-check Tailwind v4
        </span>

        <h1 className="text-5xl font-bold tracking-[-0.02em] text-white max-w-xl leading-[1.1]">
          Plus Jakarta Sans sur <span className="text-orange-500">navy 600</span>.
        </h1>

        <p className="text-base text-white/70 max-w-md leading-relaxed">
          Si tu vois ce texte dans la bonne police, le fond bleu marine et le
          bouton orange plus bas, la config Tailwind fonctionne.
        </p>

        <button
          type="button"
          className="bg-orange-500 hover:bg-orange-600 text-white font-sans font-semibold text-[15px] px-6 py-3.5 rounded-lg transition-all duration-150 hover:-translate-y-px focus:outline-none focus-visible:ring-[3px] focus-visible:ring-orange-500/40"
        >
          Bouton de test
        </button>

        <div className="mt-4 font-mono text-xs text-white/50">
          bg-navy-600 · bg-orange-500 · font-sans
        </div>
      </div>
    </main>
  );
}
