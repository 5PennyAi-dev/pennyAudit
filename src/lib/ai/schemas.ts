// Schémas Zod pour valider input/output de chaque skill.
// Alignés sur docs/specs/skills-prompts-v2.yaml et src/types/skills.ts.

import { z } from 'zod';

const confidenceLevel = z.enum(['low', 'medium', 'high']);
const reviewerNotes = z.string().nullable();

// ─────────── Skill 1 ───────────

export const skill1InputSchema = z.object({
  intake_data: z.record(z.string(), z.unknown()),
});

const industryBenchmarkSchema = z.object({
  metric: z.string(),
  value: z.string(),
  source: z.string(),
  source_year: z.string(),
  source_url: z.string().nullable().optional(),
  geographic_scope: z.enum(['quebec', 'canada', 'etats_unis', 'international']),
  relevance_to_client: z.string(),
});

const clientFigureSchema = z.object({
  raw_quote: z.string(),
  interpreted_value: z.string(),
  unit: z.enum([
    'heures',
    'minutes',
    'pourcentage',
    'nombre_absolu',
    'montant_cad',
    'autre',
  ]),
  dimension: z.enum(['temps', 'volume', 'montant', 'taux', 'autre']),
  source_field: z.string(),
});

export const skill1OutputSchema = z.object({
  business_profile: z.object({
    narrative: z.string(),
    industry_vertical: z.string(),
    business_model_type: z.string(),
    client_segment: z.string(),
  }),
  operational_context: z.object({
    contact_channels_analysis: z.string(),
    volume_tier: z.string(),
    key_operations_identified: z.array(z.string()),
  }),
  challenges_summary: z.object({
    primary_pain_points: z.array(z.string()),
    opportunity_loss_patterns: z.array(z.string()),
    stated_automation_wish: z.string(),
  }),
  maturity_assessment: z.object({
    digital_maturity_level: z.string(),
    tech_comfort_confirmed: z.string(),
    existing_stack_summary: z.string(),
    readiness_for_change: z.string(),
  }),
  industry_portrait: z.object({
    narrative: z.string(),
    benchmarks: z.array(industryBenchmarkSchema).max(5),
    search_coverage: z.enum(['complete', 'partial', 'minimal']),
  }),
  extracted_client_figures: z.object({
    figures: z.array(clientFigureSchema),
    extraction_coverage: z.enum(['rich', 'moderate', 'sparse', 'none']),
  }),
  confidence_level: confidenceLevel,
  reviewer_notes: reviewerNotes,
});

// ─────────── Skill 2 ───────────

const recommendedPath = z.enum([
  'voie_a_self_serve',
  'voie_b_accompagne',
  'voie_c_custom',
]);

export const skill2InputSchema = z.object({
  context: skill1OutputSchema,
  candidate_patterns: z.array(
    z.object({
      pattern_id: z.string(),
      content: z.unknown(),
      similarity_score: z.number(),
    }),
  ),
});

export const skill2OutputSchema = z.object({
  selected_opportunities: z
    .array(
      z.object({
        pattern_id: z.string(),
        adapted_title: z.string(),
        client_specific_framing: z.string(),
        recommended_path: recommendedPath,
        recommended_tools: z.array(
          z.object({
            name: z.string(),
            tier: z.string(),
            why_this_tool: z.string(),
            estimated_monthly_cost_cad: z.string(),
          }),
        ),
        expected_impact: z.object({
          qualitative: z.string(),
          quantitative_estimate: z.object({
            available: z.boolean(),
            basis: z.enum([
              'client_figures',
              'sector_benchmarks',
              'hybrid',
              'unavailable',
            ]),
            figures: z
              .array(
                z.object({
                  metric: z.string(),
                  low_range: z.string(),
                  high_range: z.string(),
                  unit: z.string(),
                  timeframe: z.enum([
                    'hebdomadaire',
                    'mensuel',
                    'annuel',
                    'par_evenement',
                  ]),
                }),
              )
              .max(3),
            assumptions: z.array(z.string()),
            confidence: confidenceLevel,
          }),
        }),
        effort_estimate: z.object({
          setup_effort: z.string(),
          learning_curve: z.string(),
          estimated_setup_hours: z.string(),
        }),
        // Champ de traçabilité — défaut [] si Claude l'oublie.
        source_pattern_ids: z.array(z.string()).default([]),
      }),
    )
    .min(3)
    .max(5),
  rejected_patterns: z.array(
    z.object({
      pattern_id: z.string(),
      rejection_reason: z.string(),
    }),
  ),
  selection_rationale: z.string(),
  confidence_level: confidenceLevel,
  reviewer_notes: reviewerNotes,
});

// ─────────── Skill 3 ───────────

export const skill3InputSchema = z.object({
  context: skill1OutputSchema,
  selected_opportunities: skill2OutputSchema.shape.selected_opportunities,
  patterns_risk_data: z.array(
    z.object({
      pattern_id: z.string(),
      risks: z.unknown(),
    }),
  ),
});

export const skill3OutputSchema = z.object({
  risks_identified: z.array(
    z.object({
      risk_id: z.string(),
      category: z.enum([
        'technique',
        'conformite_reglementaire',
        'humain_organisationnel',
        'donnees_confidentialite',
        'financier_roi',
      ]),
      description: z.string(),
      severity: z.enum(['faible', 'moyenne', 'elevee', 'critique']),
      affected_opportunities: z.array(z.string()),
      likelihood: z.enum([
        'peu_probable',
        'possible',
        'probable',
        'tres_probable',
      ]),
      mitigation: z.object({
        immediate_actions: z.array(z.string()),
        ongoing_practices: z.array(z.string()),
      }),
      // Champ de traçabilité — Claude l'oublie parfois, défaut [] pour
      // ne pas faire planter la validation sur un champ non-critique.
      source_pattern_ids: z.array(z.string()).default([]),
    }),
  ),
  loi_25_applicability: z.object({
    applies: z.boolean(),
    reason: z.string(),
    key_obligations: z.array(z.string()),
    recommended_actions: z.array(z.string()),
  }),
  overall_risk_level: z.enum(['faible', 'modere', 'eleve']),
  confidence_level: confidenceLevel,
  reviewer_notes: reviewerNotes,
});

// ─────────── Skill 4 ───────────

export const skill4InputSchema = z.object({
  context: skill1OutputSchema,
  selected_opportunities: skill2OutputSchema.shape.selected_opportunities,
  patterns_prereq_data: z.array(
    z.object({
      pattern_id: z.string(),
      prerequisites: z.unknown(),
    }),
  ),
});

export const skill4OutputSchema = z.object({
  stack_assessment: z.object({
    current_stack_summary: z.string(),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  integration_map: z.array(
    z.object({
      opportunity_id: z.string(),
      integration_difficulty: z.enum([
        'facile',
        'moderee',
        'complexe',
        'non_realisable_sans_prerequis',
      ]),
      integration_approach: z.string(),
      blockers_if_any: z.array(z.string()),
    }),
  ),
  dependencies_to_resolve: z.array(
    z.object({
      dependency: z.string(),
      impacts_opportunities: z.array(z.string()),
      resolution_path: z.string(),
      estimated_effort: z.string(),
    }),
  ),
  modernizations_required: z.array(
    z.object({
      current_state: z.string(),
      recommended_state: z.string(),
      justification: z.string(),
      priority: z.enum(['prerequis', 'fortement_recommande', 'optionnel']),
    }),
  ),
  overall_readiness: z.enum([
    'pret',
    'presque_pret',
    'prerequis_a_resoudre',
    'ecart_important',
  ]),
  confidence_level: confidenceLevel,
  reviewer_notes: reviewerNotes,
});

// ─────────── Skill 5 ───────────

const recommendedPathWithMixte = z.enum([
  'voie_a_self_serve',
  'voie_b_accompagne',
  'voie_c_custom',
  'mixte',
]);

export const skill5InputSchema = z.object({
  context: skill1OutputSchema,
  selected_opportunities: skill2OutputSchema.shape.selected_opportunities,
  risks_analysis: skill3OutputSchema,
  stack_audit: skill4OutputSchema,
  // Session 2G : pour chaque pattern sélectionné qui a des
  // implementation_templates, on les passe ici. Skill 5 les utilise
  // pour produire architectures_de_la_solution. Vide ([]) si aucun
  // pattern sélectionné n'a de sous-templates.
  patterns_implementation_templates: z
    .array(
      z.object({
        pattern_id: z.string(),
        implementation_templates: z.array(z.unknown()),
      }),
    )
    .default([]),
});

export const skill5OutputSchema = z.object({
  executive_summary: z.object({
    opening_paragraph: z.string(),
    key_findings: z.array(z.string()),
    top_3_recommendations: z.array(z.string()),
    expected_outcome_12_months: z.string(),
  }),
  impact_effort_matrix: z.array(
    z.object({
      opportunity_id: z.string(),
      impact_score: z.number().int().min(1).max(10),
      effort_score: z.number().int().min(1).max(10),
      quadrant: z.enum([
        'quick_win',
        'projet_strategique',
        'option_secondaire',
        'a_reconsiderer',
      ]),
    }),
  ),
  roadmap: z.object({
    phase_1_quick_wins: z.object({
      timeframe: z.string(),
      opportunities: z.array(z.string()),
      key_milestones: z.array(z.string()),
      estimated_budget_range_cad: z.string(),
    }),
    phase_2_medium_term: z.object({
      timeframe: z.string(),
      opportunities: z.array(z.string()),
      key_milestones: z.array(z.string()),
      estimated_budget_range_cad: z.string(),
    }),
    phase_3_long_term: z.object({
      timeframe: z.string(),
      opportunities: z.array(z.string()),
      strategic_direction: z.string(),
    }),
  }),
  roi_estimates: z.array(
    z.object({
      opportunity_id: z.string(),
      time_saved_qualitative: z.string(),
      revenue_impact_qualitative: z.string(),
      payback_period_qualitative: z.string(),
      notes: z.string(),
    }),
  ),
  consolidated_impact_summary: z.object({
    total_opportunities: z.number().int(),
    consolidated_figures: z
      .array(
        z.object({
          metric: z.string(),
          low_range: z.string(),
          high_range: z.string(),
          unit: z.string(),
          timeframe: z.enum(['hebdomadaire', 'mensuel', 'annuel']),
          overlap_note: z.string(),
        }),
      )
      .max(3),
    consolidation_method: z.string(),
    cautions: z.array(z.string()),
  }),
  actionable_deliverables: z
    .array(
      z.object({
        deliverable_type: z.enum([
          'ai_prompts_pack',
          'loi_25_policy_template',
          'vendor_selection_checklist',
          'automation_starter_workflow',
          'kpi_tracking_sheet',
        ]),
        title: z.string(),
        rationale: z.string(),
        content: z.record(z.string(), z.unknown()),
      }),
    )
    .min(2)
    .max(4),
  recommended_path: z.object({
    primary_path: recommendedPathWithMixte,
    rationale: z.string(),
    alternative_consideration: z.string(),
  }),
  // Optionnel : présent uniquement pour les opportunités dont le pattern
  // source contient des `implementation_templates` (session 2G).
  architectures_de_la_solution: z
    .array(
      z.object({
        opportunity_id: z.string(),
        sub_template_id: z.string(),
        sub_template_match_score: z.number().int().min(0),
        adapted_content: z.string(),
      }),
    )
    .optional(),
  closing_notes: z.string(),
  confidence_level: confidenceLevel,
  reviewer_notes: reviewerNotes,
});

// ─────────── Skill 6 (Session 2E — diagrammes) ───────────

export const skill6InputSchema = z.object({
  context: skill1OutputSchema,
  selected_opportunities: skill2OutputSchema.shape.selected_opportunities,
  synthesis: skill5OutputSchema,
});

const diagramComponentSchema = z.object({
  id: z.string(),
  kind: z.enum([
    'silhouette_endpoint',
    'secondary_box',
    'central_box',
    'resource_box_top',
  ]),
  position: z.enum([
    'LEFT',
    'CENTER-LEFT',
    'UPPER-CENTER',
    'CENTER',
    'CENTER-RIGHT',
    'RIGHT',
    'RIGHT-CENTER',
  ]),
  label: z.string(),
  subtitle: z.string().nullable().optional(),
  icon_hint: z.string(),
  badge: z
    .object({
      title_line: z.string(),
      subtitle_line: z.string(),
      icon_hint: z.string(),
    })
    .nullable()
    .optional(),
});

const diagramArrowSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().nullable().optional(),
  style: z.enum(['horizontal', 'vertical_down', 'return_arc', 'branch']),
});

export const skill6OutputSchema = z.object({
  diagrams: z.array(
    z.object({
      solution_id: z.string(),
      title: z.string(),
      phase: z.enum(['phase_1', 'phase_2']),
      subject: z.string(),
      components: z.array(diagramComponentSchema).min(2).max(8),
      arrows: z.array(diagramArrowSchema),
      prompt_full: z.string(),
    }),
  ),
  confidence_level: confidenceLevel,
  reviewer_notes: reviewerNotes,
});
