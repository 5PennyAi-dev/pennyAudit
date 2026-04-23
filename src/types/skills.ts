// Types TypeScript des 5 skills du pipeline d'audit IA.
// Source de vérité : docs/specs/skills-prompts-v1.yaml (output_schema).

import type { IntakeFormData } from './intake';

// ─────────── Enums partagés ───────────

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type RecommendedPath =
  | 'voie_a_self_serve'
  | 'voie_b_accompagne'
  | 'voie_c_custom'
  | 'mixte';

export type Quadrant =
  | 'quick_win'
  | 'projet_strategique'
  | 'option_secondaire'
  | 'a_reconsiderer';

export type RiskCategory =
  | 'technique'
  | 'conformite_reglementaire'
  | 'humain_organisationnel'
  | 'donnees_confidentialite'
  | 'financier_roi';

export type SeverityLevel = 'faible' | 'moyenne' | 'elevee' | 'critique';

export type Likelihood =
  | 'peu_probable'
  | 'possible'
  | 'probable'
  | 'tres_probable';

export type OverallRiskLevel = 'faible' | 'modere' | 'eleve';

export type IntegrationDifficulty =
  | 'facile'
  | 'moderee'
  | 'complexe'
  | 'non_realisable_sans_prerequis';

export type OverallReadiness =
  | 'pret'
  | 'presque_pret'
  | 'prerequis_a_resoudre'
  | 'ecart_important';

export type ModernizationPriority =
  | 'prerequis'
  | 'fortement_recommande'
  | 'optionnel';

export type VolumeTier = 'low' | 'medium' | 'high' | 'very_high';

export type DigitalMaturityLevel =
  | 'beginner'
  | 'emerging'
  | 'established'
  | 'advanced';

export type ReadinessForChange = 'low' | 'medium' | 'high';

// ─────────── Skill 1 — Context Builder ───────────

export interface Skill1Input {
  intake_data: IntakeFormData;
}

export interface Skill1Output {
  business_profile: {
    narrative: string;
    industry_vertical: string;
    business_model_type: string;
    client_segment: string;
  };
  operational_context: {
    contact_channels_analysis: string;
    volume_tier: VolumeTier | string;
    key_operations_identified: string[];
  };
  challenges_summary: {
    primary_pain_points: string[];
    opportunity_loss_patterns: string[];
    stated_automation_wish: string;
  };
  maturity_assessment: {
    digital_maturity_level: DigitalMaturityLevel | string;
    tech_comfort_confirmed: string;
    existing_stack_summary: string;
    readiness_for_change: ReadinessForChange | string;
  };
  confidence_level: ConfidenceLevel;
  reviewer_notes: string | null;
}

// ─────────── Skill 2 — Opportunity Finder ───────────

export interface CandidatePattern {
  pattern_id: string;
  content: unknown;
  similarity_score: number;
}

export interface Skill2Input {
  context: Skill1Output;
  candidate_patterns: CandidatePattern[];
}

export interface RecommendedTool {
  name: string;
  tier: string;
  why_this_tool: string;
  estimated_monthly_cost_cad: string;
}

export interface SelectedOpportunity {
  pattern_id: string;
  adapted_title: string;
  client_specific_framing: string;
  recommended_path: RecommendedPath;
  recommended_tools: RecommendedTool[];
  expected_impact: {
    qualitative: string;
    quantitative_if_available: string;
  };
  effort_estimate: {
    setup_effort: string;
    learning_curve: string;
    estimated_setup_hours: string;
  };
  source_pattern_ids: string[];
}

export interface RejectedPattern {
  pattern_id: string;
  rejection_reason: string;
}

export interface Skill2Output {
  selected_opportunities: SelectedOpportunity[];
  rejected_patterns: RejectedPattern[];
  selection_rationale: string;
  confidence_level: ConfidenceLevel;
  reviewer_notes: string | null;
}

// ─────────── Skill 3 — Risk Analyzer ───────────

export interface PatternRiskData {
  pattern_id: string;
  risks: unknown;
}

export interface Skill3Input {
  context: Skill1Output;
  selected_opportunities: SelectedOpportunity[];
  patterns_risk_data: PatternRiskData[];
}

export interface RiskIdentified {
  risk_id: string;
  category: RiskCategory;
  description: string;
  severity: SeverityLevel;
  affected_opportunities: string[];
  likelihood: Likelihood;
  mitigation: {
    immediate_actions: string[];
    ongoing_practices: string[];
  };
  source_pattern_ids: string[];
}

export interface Loi25Applicability {
  applies: boolean;
  reason: string;
  key_obligations: string[];
  recommended_actions: string[];
}

export interface Skill3Output {
  risks_identified: RiskIdentified[];
  loi_25_applicability: Loi25Applicability;
  overall_risk_level: OverallRiskLevel;
  confidence_level: ConfidenceLevel;
  reviewer_notes: string | null;
}

// ─────────── Skill 4 — Tech Stack Auditor ───────────

export interface PatternPrereqData {
  pattern_id: string;
  prerequisites: unknown;
}

export interface Skill4Input {
  context: Skill1Output;
  selected_opportunities: SelectedOpportunity[];
  patterns_prereq_data: PatternPrereqData[];
}

export interface IntegrationMapEntry {
  opportunity_id: string;
  integration_difficulty: IntegrationDifficulty;
  integration_approach: string;
  blockers_if_any: string[];
}

export interface Dependency {
  dependency: string;
  impacts_opportunities: string[];
  resolution_path: string;
  estimated_effort: string;
}

export interface Modernization {
  current_state: string;
  recommended_state: string;
  justification: string;
  priority: ModernizationPriority;
}

export interface Skill4Output {
  stack_assessment: {
    current_stack_summary: string;
    strengths: string[];
    gaps: string[];
  };
  integration_map: IntegrationMapEntry[];
  dependencies_to_resolve: Dependency[];
  modernizations_required: Modernization[];
  overall_readiness: OverallReadiness;
  confidence_level: ConfidenceLevel;
  reviewer_notes: string | null;
}

// ─────────── Skill 5 — Synthesis + ROI + Roadmap ───────────

export interface Skill5Input {
  context: Skill1Output;
  selected_opportunities: SelectedOpportunity[];
  risks_analysis: Skill3Output;
  stack_audit: Skill4Output;
}

export interface ImpactEffortEntry {
  opportunity_id: string;
  impact_score: number;
  effort_score: number;
  quadrant: Quadrant;
}

export interface RoadmapPhase1 {
  timeframe: string;
  opportunities: string[];
  key_milestones: string[];
  estimated_budget_range_cad: string;
}

export interface RoadmapPhase3 {
  timeframe: string;
  opportunities: string[];
  strategic_direction: string;
}

export interface RoiEstimate {
  opportunity_id: string;
  time_saved_qualitative: string;
  revenue_impact_qualitative: string;
  payback_period_qualitative: string;
  notes: string;
}

export interface Skill5Output {
  executive_summary: {
    opening_paragraph: string;
    key_findings: string[];
    top_3_recommendations: string[];
    expected_outcome_12_months: string;
  };
  impact_effort_matrix: ImpactEffortEntry[];
  roadmap: {
    phase_1_quick_wins: RoadmapPhase1;
    phase_2_medium_term: RoadmapPhase1;
    phase_3_long_term: RoadmapPhase3;
  };
  roi_estimates: RoiEstimate[];
  recommended_path: {
    primary_path: RecommendedPath;
    rationale: string;
    alternative_consideration: string;
  };
  closing_notes: string;
  confidence_level: ConfidenceLevel;
  reviewer_notes: string | null;
}

// ─────────── État agrégé du pipeline ───────────

export interface AuditPipelineState {
  skill_1_output: Skill1Output | null;
  skill_2_output: Skill2Output | null;
  skill_3_output: Skill3Output | null;
  skill_4_output: Skill4Output | null;
  skill_5_output: Skill5Output | null;
}

// ─────────── Événements SSE ───────────

export type SSEEventName =
  | 'pipeline_started'
  | 'skill_1_started'
  | 'skill_1_completed'
  | 'matching_started'
  | 'matching_completed'
  | 'skill_2_started'
  | 'skill_2_completed'
  | 'skills_3_4_started'
  | 'skill_3_completed'
  | 'skill_4_completed'
  | 'skills_3_4_completed'
  | 'skill_5_started'
  | 'skill_5_completed'
  | 'pipeline_completed'
  | 'pipeline_error';

export interface SSEEvent<T = unknown> {
  event: SSEEventName;
  data: T;
}

export interface SSEPipelineStartedData {
  auditId: string;
}
export interface SSESkillStartedData {
  skillName: string;
  skillId?: number;
}
export interface SSESkillCompletedData {
  skillId: number;
  tokensUsed?: number;
  durationMs?: number;
}
export interface SSEMatchingData {
  patternsFound?: number;
  message?: string;
}
export interface SSEPipelineCompletedData {
  auditId: string;
  message: string;
}
export interface SSEPipelineErrorData {
  message: string;
  failedAt?: string;
}
