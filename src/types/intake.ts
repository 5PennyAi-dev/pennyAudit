// Types du formulaire d'intake — Source de vérité : docs/specs/intake-form-v1.yaml
// Ces types reflètent les field_id et enums de la spec YAML.

// ─────────── Enums (options des champs select / radio / multi_select) ───────────

export type Industry =
  | 'services_professionnels'
  | 'sante_bien_etre'
  | 'services_domicile'
  | 'beaute_soins'
  | 'commerce_detail'
  | 'restauration'
  | 'education_formation'
  | 'immobilier'
  | 'commerce_ligne'
  | 'arts_culture'
  | 'autre';

export type CompanySize =
  | 'solo'
  | 'micro_2_5'
  | 'small_6_20'
  | 'medium_21_50'
  | 'large_50_plus';

export type PrimaryLocation = 'quebec' | 'canada_hors_qc' | 'international';

export type RevenueModel = 'services' | 'produits' | 'abonnement' | 'mixte';

export type ClientType = 'b2c' | 'b2b' | 'mixte';

export type ContactChannel =
  | 'telephone'
  | 'courriel'
  | 'chat_web'
  | 'sms'
  | 'formulaire_web'
  | 'reseaux_sociaux'
  | 'en_personne';

export type ClientVolume = 'less_10' | 'v_10_50' | 'v_50_200' | 'more_200';

export type LostOpportunity =
  | 'appels_manques'
  | 'reponses_lentes'
  | 'suivi_oublie'
  | 'prise_rdv'
  | 'visibilite_ligne'
  | 'contenu_marketing'
  | 'admin_chronophage'
  | 'autre';

export type CurrentTool =
  | 'crm'
  | 'email_marketing'
  | 'scheduling'
  | 'chat_client'
  | 'comptabilite'
  | 'facturation'
  | 'reseaux_sociaux_mgmt'
  | 'bureautique'
  | 'telephonie_voip'
  | 'cms_site'
  | 'automatisation'
  | 'aucun';

export type DataSensitivity =
  | 'basique'
  | 'financier'
  | 'sante'
  | 'juridique'
  | 'aucune_sensible';

export type TechComfort = 'debutant' | 'a_laise' | 'avance';

export type BudgetRange =
  | 'under_500'
  | 'r_500_2k'
  | 'r_2k_5k'
  | 'r_5k_15k'
  | 'more_15k';

export type ImplementationHorizon =
  | 'under_1_month'
  | 'h_1_3_months'
  | 'h_3_6_months'
  | 'h_6_12_months';

export type PreferredApproach =
  | 'voie_a_self'
  | 'voie_b_accompagne'
  | 'voie_c_delegue';

// ─────────── Données du formulaire ───────────

// Toutes les clés sont optionnelles côté modèle : le formulaire se remplit
// progressivement. La validation par écran décide de ce qui est requis.
export interface IntakeFormData {
  // Écran 1
  first_name?: string;
  email?: string;

  // Écran 2 — Bloc 1 : entreprise
  business_name?: string;
  industry?: Industry;
  industry_other?: string;
  company_size?: CompanySize;
  primary_location?: PrimaryLocation;
  website_url?: string;

  // Écran 3 — Bloc 2 : opérations
  revenue_model?: RevenueModel;
  client_type?: ClientType;
  contact_channels?: ContactChannel[];
  client_volume?: ClientVolume;

  // Écran 4 — Bloc 3 : défis
  time_consuming_tasks?: string;
  lost_opportunities?: LostOpportunity[];
  lost_opportunities_detail?: string;
  automation_wish?: string;

  // Écran 5 — Bloc 4 : stack
  current_tools?: CurrentTool[];
  data_sensitivity?: DataSensitivity;
  tech_comfort?: TechComfort;

  // Écran 6 — Bloc 5 : ressources
  budget_range?: BudgetRange;
  implementation_horizon?: ImplementationHorizon;
  preferred_approach?: PreferredApproach;
  additional_context?: string;

  // Écran 7 — confirmation
  terms_acceptance?: boolean;
  marketing_consent?: boolean;
}

export type IntakeFieldId = keyof IntakeFormData;

// ─────────── Écrans ───────────

export type ScreenId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TOTAL_SCREENS: ScreenId = 7;

// ─────────── Validation ───────────

export interface FormValidationError {
  fieldId: IntakeFieldId;
  message: string;
}

export type FormErrors = Partial<Record<IntakeFieldId, string>>;

// ─────────── État global du formulaire ───────────

export interface IntakeFormState {
  formData: IntakeFormData;
  currentScreen: ScreenId;
  errors: FormErrors;
  auditId: string | null;
  isSaving: boolean;
  isSubmitting: boolean;
  lastSavedAt: string | null;
}
