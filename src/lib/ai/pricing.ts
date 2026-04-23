// Tarification Anthropic (USD par million de tokens).
// À mettre à jour quand Anthropic révise ses prix ou qu'on change de modèle.
// Source : https://docs.anthropic.com/claude/docs/pricing (à vérifier).

export interface ModelRate {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const MODEL_PRICING_USD: Record<string, ModelRate> = {
  'claude-opus-4-7': { inputPerMTok: 15, outputPerMTok: 75 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5-20251001': { inputPerMTok: 1, outputPerMTok: 5 },
};

export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = MODEL_PRICING_USD[model];
  if (!rate) {
    console.warn(`[pricing] modèle inconnu: ${model} — cost=0.`);
    return 0;
  }
  const cost =
    (inputTokens / 1_000_000) * rate.inputPerMTok +
    (outputTokens / 1_000_000) * rate.outputPerMTok;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6 décimales
}
