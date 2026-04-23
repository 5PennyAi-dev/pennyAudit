export function IntakeSubmitted() {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 text-center sm:px-6">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-500">
          Intake reçu
        </span>
        <h1 className="font-sans text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-navy-600">
          Merci — votre audit est en préparation.
        </h1>
        <p className="text-base leading-relaxed text-muted">
          Nous avons bien reçu vos réponses. En Session 2B, cette page deviendra
          l'écran de progression temps réel. Pour l'instant, vous pouvez fermer
          l'onglet : vous recevrez votre rapport par courriel dès qu'il sera
          prêt.
        </p>
      </div>
    </div>
  );
}
