// Options des champs enum du formulaire, copiées fidèlement du YAML.
// Source : docs/specs/intake-form-v1.yaml

import type {
  BudgetRange,
  ClientType,
  ClientVolume,
  CompanySize,
  ContactChannel,
  CurrentTool,
  DataSensitivity,
  ImplementationHorizon,
  Industry,
  LostOpportunity,
  PreferredApproach,
  PrimaryLocation,
  RevenueModel,
  TechComfort,
} from '../types/intake';

export interface Option<V extends string> {
  value: V;
  label: string;
}

export const INDUSTRY_OPTIONS: Option<Industry>[] = [
  { value: 'services_professionnels', label: 'Services professionnels (avocats, notaires, comptables, consultants)' },
  { value: 'sante_bien_etre', label: 'Santé et bien-être (cliniques, dentistes, physio, psychologues)' },
  { value: 'services_domicile', label: 'Services à domicile (plomberie, électricité, rénovation, paysagement)' },
  { value: 'beaute_soins', label: 'Beauté et soins personnels (salons, spas, barbiers)' },
  { value: 'commerce_detail', label: 'Commerce de détail (boutiques, commerces spécialisés)' },
  { value: 'restauration', label: 'Restauration et alimentation' },
  { value: 'education_formation', label: 'Éducation et formation (coachs, formateurs, écoles privées)' },
  { value: 'immobilier', label: 'Immobilier et courtage' },
  { value: 'commerce_ligne', label: 'Commerce en ligne (e-commerce)' },
  { value: 'arts_culture', label: 'Arts, culture et événementiel' },
  { value: 'autre', label: 'Autre (préciser)' },
];

export const COMPANY_SIZE_OPTIONS: Option<CompanySize>[] = [
  { value: 'solo', label: 'Je travaille seul(e)' },
  { value: 'micro_2_5', label: '2 à 5 personnes' },
  { value: 'small_6_20', label: '6 à 20 personnes' },
  { value: 'medium_21_50', label: '21 à 50 personnes' },
  { value: 'large_50_plus', label: 'Plus de 50 personnes' },
];

export const PRIMARY_LOCATION_OPTIONS: Option<PrimaryLocation>[] = [
  { value: 'quebec', label: 'Québec' },
  { value: 'canada_hors_qc', label: 'Canada (hors Québec)' },
  { value: 'international', label: 'International ou multi-juridictions' },
];

export const REVENUE_MODEL_OPTIONS: Option<RevenueModel>[] = [
  { value: 'services', label: "Services (facturation à l'heure, au projet ou au forfait)" },
  { value: 'produits', label: 'Produits (vente physique ou numérique)' },
  { value: 'abonnement', label: 'Abonnement récurrent' },
  { value: 'mixte', label: 'Mixte (plusieurs sources)' },
];

export const CLIENT_TYPE_OPTIONS: Option<ClientType>[] = [
  { value: 'b2c', label: 'Des particuliers (B2C)' },
  { value: 'b2b', label: "D'autres entreprises (B2B)" },
  { value: 'mixte', label: 'Les deux' },
];

export const CONTACT_CHANNEL_OPTIONS: Option<ContactChannel>[] = [
  { value: 'telephone', label: 'Téléphone' },
  { value: 'courriel', label: 'Courriel' },
  { value: 'chat_web', label: 'Chat sur le site web' },
  { value: 'sms', label: 'Texto (SMS)' },
  { value: 'formulaire_web', label: 'Formulaire sur le site web' },
  { value: 'reseaux_sociaux', label: 'Réseaux sociaux (Messenger, Instagram, etc.)' },
  { value: 'en_personne', label: 'En personne / sur place' },
];

export const CLIENT_VOLUME_OPTIONS: Option<ClientVolume>[] = [
  { value: 'less_10', label: 'Moins de 10' },
  { value: 'v_10_50', label: '10 à 50' },
  { value: 'v_50_200', label: '50 à 200' },
  { value: 'more_200', label: 'Plus de 200' },
];

export const LOST_OPPORTUNITY_OPTIONS: Option<LostOpportunity>[] = [
  { value: 'appels_manques', label: "Appels manqués hors des heures d'ouverture" },
  { value: 'reponses_lentes', label: 'Réponses trop lentes aux demandes' },
  { value: 'suivi_oublie', label: 'Manque de suivi avec les prospects' },
  { value: 'prise_rdv', label: 'Difficulté à prendre des rendez-vous' },
  { value: 'visibilite_ligne', label: 'Manque de visibilité en ligne' },
  { value: 'contenu_marketing', label: 'Pas assez de contenu marketing produit' },
  { value: 'admin_chronophage', label: 'Tâches administratives qui grugent le temps de vente' },
  { value: 'autre', label: 'Autre situation' },
];

export const CURRENT_TOOLS_OPTIONS: Option<CurrentTool>[] = [
  { value: 'crm', label: 'CRM (HubSpot, Salesforce, Pipedrive, Zoho…)' },
  { value: 'email_marketing', label: 'Email marketing (Mailchimp, Brevo, Constant Contact…)' },
  { value: 'scheduling', label: 'Prise de rendez-vous (Calendly, Cal.com, GOrendezvous…)' },
  { value: 'chat_client', label: 'Chat client (Crisp, Tidio, Intercom…)' },
  { value: 'comptabilite', label: 'Comptabilité (QuickBooks, Xero, Sage…)' },
  { value: 'facturation', label: 'Facturation (FreshBooks, Wave, Square…)' },
  { value: 'reseaux_sociaux_mgmt', label: 'Gestion de réseaux sociaux (Hootsuite, Buffer, Meta Business…)' },
  { value: 'bureautique', label: 'Suite bureautique (Microsoft 365, Google Workspace)' },
  { value: 'telephonie_voip', label: 'Téléphonie VoIP ou service virtuel' },
  { value: 'cms_site', label: 'Site web / CMS (WordPress, Shopify, Wix, Webflow…)' },
  { value: 'automatisation', label: 'Automatisation (Zapier, Make, n8n…)' },
  { value: 'aucun', label: 'Aucun outil numérique formalisé' },
];

export const DATA_SENSITIVITY_OPTIONS: Option<DataSensitivity>[] = [
  { value: 'basique', label: 'Informations de base (nom, courriel, téléphone)' },
  { value: 'financier', label: 'Informations financières ou de paiement' },
  { value: 'sante', label: 'Données de santé ou médicales' },
  { value: 'juridique', label: 'Données juridiques ou légales confidentielles' },
  { value: 'aucune_sensible', label: 'Aucune donnée sensible traitée' },
];

export const TECH_COMFORT_OPTIONS: Option<TechComfort>[] = [
  { value: 'debutant', label: "Débutant — je préfère qu'on me guide pas à pas" },
  { value: 'a_laise', label: "À l'aise — je me débrouille avec la plupart des outils" },
  { value: 'avance', label: "Avancé — je n'ai pas peur d'installer, configurer, scripter" },
];

export const BUDGET_RANGE_OPTIONS: Option<BudgetRange>[] = [
  { value: 'under_500', label: 'Moins de 500 $' },
  { value: 'r_500_2k', label: '500 $ à 2 000 $' },
  { value: 'r_2k_5k', label: '2 000 $ à 5 000 $' },
  { value: 'r_5k_15k', label: '5 000 $ à 15 000 $' },
  { value: 'more_15k', label: 'Plus de 15 000 $' },
];

export const IMPLEMENTATION_HORIZON_OPTIONS: Option<ImplementationHorizon>[] = [
  { value: 'under_1_month', label: "Moins d'un mois (urgent)" },
  { value: 'h_1_3_months', label: '1 à 3 mois' },
  { value: 'h_3_6_months', label: '3 à 6 mois' },
  { value: 'h_6_12_months', label: '6 à 12 mois' },
];

export const PREFERRED_APPROACH_OPTIONS: Option<PreferredApproach>[] = [
  { value: 'voie_a_self', label: "Je veux faire ça moi-même avec des outils prêts à l'emploi" },
  { value: 'voie_b_accompagne', label: "J'aimerais un accompagnement léger pour la configuration" },
  { value: 'voie_c_delegue', label: 'Je préfère déléguer complètement à un partenaire expert' },
];

export function getLabel<V extends string>(
  options: ReadonlyArray<Option<V>>,
  value: V | undefined,
): string {
  if (!value) return '';
  return options.find((o) => o.value === value)?.label ?? value;
}

export function getLabels<V extends string>(
  options: ReadonlyArray<Option<V>>,
  values: V[] | undefined,
): string[] {
  if (!values) return [];
  return values.map((v) => getLabel(options, v));
}
