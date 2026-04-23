// Configuration centralisée des appels IA pour le pipeline d'audit.
// Source de vérité : docs/specs/skills-prompts-v1.yaml (bloc meta + chaque skill).

export const ANTHROPIC_MODEL_DEFAULT = 'claude-opus-4-7';
export const VOYAGE_MODEL = 'voyage-3';
export const VOYAGE_DIMS = 1024;

export interface SkillModelParams {
  model: string;
  temperature: number;
  maxTokens: number;
}

// Paramètres par skill, copiés du YAML. Un seul endroit à modifier si on
// ajuste (ex. basculer un skill vers Sonnet pour coûts).
export const SKILL_MODEL_CONFIG: Record<1 | 2 | 3 | 4 | 5, SkillModelParams> = {
  1: { model: ANTHROPIC_MODEL_DEFAULT, temperature: 0.3, maxTokens: 4000 },
  2: { model: ANTHROPIC_MODEL_DEFAULT, temperature: 0.4, maxTokens: 8000 },
  3: { model: ANTHROPIC_MODEL_DEFAULT, temperature: 0.3, maxTokens: 5000 },
  4: { model: ANTHROPIC_MODEL_DEFAULT, temperature: 0.3, maxTokens: 5000 },
  5: { model: ANTHROPIC_MODEL_DEFAULT, temperature: 0.4, maxTokens: 10000 },
};

export type SkillId = 1 | 2 | 3 | 4 | 5;
