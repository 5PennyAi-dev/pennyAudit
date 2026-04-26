// Mapping snake_case → libellé humain français pour les secteurs
// (industry_vertical / intake.industry).
//
// Source des slugs : src/types/intake.ts (Industry) — calé sur ce que le
// formulaire d'intake produit. Le pipeline (Skill 1) reprend tel quel
// `intake_data.industry` dans `business_profile.industry_vertical`,
// donc le même mapping convient pour les deux usages.
//
// Utilisé dans :
//   - src/components/admin/AuditsList.tsx        (colonne Secteur)
//   - src/lib/report/docx-builder.ts             (page de titre / contexte)

export const INDUSTRY_LABELS: Record<string, string> = {
  services_professionnels: 'Services professionnels',
  sante_bien_etre: 'Santé et bien-être',
  services_domicile: 'Services à domicile',
  beaute_soins: 'Beauté et soins',
  commerce_detail: 'Commerce de détail',
  restauration: 'Restauration',
  education_formation: 'Éducation et formation',
  immobilier: 'Immobilier',
  commerce_ligne: 'Commerce en ligne',
  arts_culture: 'Arts et culture',
  autre: 'Autre',
};

/**
 * Retourne le libellé humain d'un secteur. Si le slug n'est pas connu,
 * on retourne le slug tel quel — utile pour repérer une régression
 * (un nouveau secteur produit par le pipeline qu'on aurait oublié de
 * cataloguer ici).
 */
export function industryLabel(slug: string | null | undefined): string {
  if (!slug) return '—';
  return INDUSTRY_LABELS[slug] ?? slug;
}
