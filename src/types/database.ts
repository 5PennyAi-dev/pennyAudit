// Types TypeScript alignés sur sql/schema.sql.
// Pour chaque table : Row (lecture) + Insert (écriture, champs optionnels).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─────────────── CLIENTS ───────────────

export interface ClientRow {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  business_name: string | null;
  business_type: string | null;
  business_size: string | null;
  industry: string | null;
  language: string;
  location_province: string | null;
  location_city: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface ClientInsert {
  id?: string;
  auth_user_id?: string | null;
  email: string;
  full_name?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  business_size?: string | null;
  industry?: string | null;
  language?: string;
  location_province?: string | null;
  location_city?: string | null;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
}

// ─────────────── AUDITS ───────────────

// Liste définitive alignée avec le CHECK constraint SQL
// (sql/migrations/2026-04-23_audits_status_check.sql).
// 'approved' et 'delivered' sont prévus pour la Session 2C.
export type AuditStatus =
  | 'draft'
  | 'running'
  | 'pending_review'
  | 'approved'
  | 'delivered'
  | 'error';

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export type AuditTier = 'A' | 'B' | 'C';

export interface AuditRow {
  id: string;
  client_id: string;
  status: AuditStatus;
  current_skill: number;
  stripe_payment_intent_id: string | null;
  payment_status: PaymentStatus;
  amount_cad: number | null;
  tier: AuditTier;
  intake_data: Json;
  skill_1_output: Json | null;
  skill_2_output: Json | null;
  skill_3_output: Json | null;
  skill_4_output: Json | null;
  skill_5_output: Json | null;
  pattern_ids: string[] | null;
  final_document_url: string | null;
  final_document_generated_at: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  exported_at: string | null;
  error_message: string | null;
  error_at_skill: number | null;
  resume_email_sent_at: string | null;
  pipeline_completed_at: string | null;
  docx_storage_path: string | null;
  docx_generated_at: string | null;
}

export interface AuditInsert {
  id?: string;
  client_id: string;
  status?: AuditStatus;
  current_skill?: number;
  stripe_payment_intent_id?: string | null;
  payment_status?: PaymentStatus;
  amount_cad?: number | null;
  tier?: AuditTier;
  intake_data?: Json;
  skill_1_output?: Json | null;
  skill_2_output?: Json | null;
  skill_3_output?: Json | null;
  skill_4_output?: Json | null;
  skill_5_output?: Json | null;
  pattern_ids?: string[] | null;
  final_document_url?: string | null;
  final_document_generated_at?: string | null;
  created_at?: string;
  updated_at?: string;
  paid_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  exported_at?: string | null;
  error_message?: string | null;
  error_at_skill?: number | null;
  resume_email_sent_at?: string | null;
  pipeline_completed_at?: string | null;
}

// ─────────────── PATTERNS ───────────────

export type PatternConfidenceLevel = 'low' | 'medium' | 'high';

export interface PatternRow {
  id: string;
  content: Json;
  title_fr: string;
  title_en: string | null;
  category: string | null;
  version: string;
  target_industries: string[] | null;
  target_business_sizes: string[] | null;
  tech_comfort_required: string | null;
  embedding_source: string | null;
  embedding: number[] | null;
  confidence_level: PatternConfidenceLevel | null;
  created_at: string;
  updated_at: string;
}

export interface PatternInsert {
  id: string;
  content: Json;
  title_fr: string;
  title_en?: string | null;
  category?: string | null;
  version: string;
  target_industries?: string[] | null;
  target_business_sizes?: string[] | null;
  tech_comfort_required?: string | null;
  embedding_source?: string | null;
  embedding?: number[] | null;
  confidence_level?: PatternConfidenceLevel | null;
  created_at?: string;
  updated_at?: string;
}

// ─────────────── AUDIT_TEMPLATES ───────────────

export interface AuditTemplateRow {
  id: string;
  skill_number: number;
  name: string;
  version: string;
  prompt_template: string;
  output_schema: Json | null;
  model: string;
  is_active: boolean;
  created_at: string;
}

export interface AuditTemplateInsert {
  id?: string;
  skill_number: number;
  name: string;
  version: string;
  prompt_template: string;
  output_schema?: Json | null;
  model?: string;
  is_active?: boolean;
  created_at?: string;
}

// ─────────────── AUDIT_LOGS ───────────────

export interface AuditLogRow {
  id: string;
  audit_id: string | null;
  event_type: string;
  skill_number: number | null;
  metadata: Json | null;
  duration_ms: number | null;
  tokens_used: number | null;
  cost_usd: number | null;
  created_at: string;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
}

export interface AuditLogInsert {
  id?: string;
  audit_id?: string | null;
  event_type: string;
  skill_number?: number | null;
  metadata?: Json | null;
  duration_ms?: number | null;
  tokens_used?: number | null;
  cost_usd?: number | null;
  created_at?: string;
  model_used?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
}
