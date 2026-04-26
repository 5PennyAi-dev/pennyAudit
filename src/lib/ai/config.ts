// Configuration centralisée des appels IA pour le pipeline d'audit.
// Source de vérité : docs/specs/skills-prompts-v2.yaml (bloc meta + chaque skill).

export const ANTHROPIC_MODEL_DEFAULT = 'claude-opus-4-7';
export const VOYAGE_MODEL = 'voyage-3';
export const VOYAGE_DIMS = 1024;

// Outils côté serveur (Anthropic). Le Skill 1 utilise web_search en v2
// pour aller chercher 3-5 chiffres sectoriels sourcés.
export interface WebSearchTool {
  type: 'web_search_20250305';
  name: 'web_search';
  max_uses: number;
}

export type SkillTool = WebSearchTool;

export interface SkillModelParams {
  model: string;
  maxTokens: number;
  tools?: SkillTool[];
}

// Paramètres par skill. Un seul endroit à modifier si on ajuste (ex.
// basculer un skill vers Sonnet pour coûts).
//
// Note : depuis Opus 4.7, temperature/top_p/top_k ne sont plus acceptés
// par l'API Anthropic.
export const SKILL_MODEL_CONFIG: Record<1 | 2 | 3 | 4 | 5 | 6, SkillModelParams> = {
  1: {
    model: ANTHROPIC_MODEL_DEFAULT,
    maxTokens: 6000,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
    ],
  },
  2: { model: ANTHROPIC_MODEL_DEFAULT, maxTokens: 12000 },
  3: { model: ANTHROPIC_MODEL_DEFAULT, maxTokens: 8000 },
  4: { model: ANTHROPIC_MODEL_DEFAULT, maxTokens: 8000 },
  5: { model: ANTHROPIC_MODEL_DEFAULT, maxTokens: 20000 },
  // Skill 6 : 16000 (chaque prompt_full ~2000 chars / ~600 tokens,
  // 4 diagrammes typiques + structure JSON ≈ 5000 tokens output mini ;
  // marge x3 pour absorber les cas avec 5+ opportunités phase 1+2).
  6: { model: ANTHROPIC_MODEL_DEFAULT, maxTokens: 16000 },
};

export type SkillId = 1 | 2 | 3 | 4 | 5 | 6;
