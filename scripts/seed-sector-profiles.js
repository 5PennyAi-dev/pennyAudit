/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRIPT DE SEED — Profils sectoriels (sector_profiles)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Usage :
 *   node scripts/seed-sector-profiles.js
 *
 * Ce script :
 *   1. Lit tous les fichiers YAML dans /sector-profiles/
 *   2. Construit un texte d'embedding adapté au format profil sectoriel
 *      (cadre réglementaire, persona métier, outils sectoriels, KPIs,
 *      pain points, risques)
 *   3. Construit le tableau industry_keywords (priorité au champ YAML
 *      industry_match_keywords s'il existe, sinon table de fallback
 *      par id)
 *   4. Génère un embedding Voyage-3 (1024 dims, inputType='document')
 *   5. Upsert dans la table sector_profiles
 *
 * Variables d'environnement requises (.env) :
 *   SUPABASE_URL ou VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VOYAGE_API_KEY
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

const SECTOR_PROFILES_DIR = path.resolve('./sector-profiles');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

const EMBEDDING_MODEL = 'voyage-3';
const EMBEDDING_DIMS = 1024;
const EMBEDDING_SOURCE_MAX_CHARS = 10000;

// Fallback de mots-clés d'industrie par id de profil. Utilisé si le
// YAML ne définit pas explicitement industry_match_keywords. Chaque
// nouveau profil sectoriel devrait soit définir ce champ dans le YAML,
// soit ajouter une entrée ici.
const INDUSTRY_KEYWORDS_FALLBACK = {
  'secteur-courtage-immobilier-qc-residentiel': [
    'courtage-immobilier',
    'agent-immobilier',
    'courtier-immobilier',
    'immobilier',
    'agence-immobiliere',
    'courtier-residentiel',
  ],
};

// ─────────────────────────────────────────────────────────────
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ─────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env');
  process.exit(1);
}

if (!VOYAGE_API_KEY) {
  console.error('❌ VOYAGE_API_KEY est requis');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const VOYAGE_ENDPOINT = 'https://api.voyageai.com/v1/embeddings';

const VOYAGE_REQUEST_DELAY_MS = Number(
  process.env.VOYAGE_REQUEST_DELAY_MS ?? 200,
);

// ─────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────────────────────

/**
 * Construit le texte qui sera embeddé pour un profil sectoriel.
 * Sections nommées en français pour aider Voyage-3, robustes aux
 * champs absents, troncature douce à EMBEDDING_SOURCE_MAX_CHARS.
 */
function buildEmbeddingSource(profile) {
  const sections = [];

  const pushSection = (label, value) => {
    if (!value) return;
    const text = String(value).trim();
    if (!text) return;
    sections.push(`${label} :\n${text}`);
  };

  const joinList = (list, sep = ', ') =>
    Array.isArray(list) ? list.filter(Boolean).join(sep) : '';

  // ── Identité ────────────────────────────────────────────────
  pushSection('SECTEUR', profile.title_fr);
  pushSection('SEGMENT PRIMAIRE', profile.primary_segment_fr);

  const secondary = joinList(profile.secondary_segments_fr);
  if (secondary) pushSection('SEGMENTS SECONDAIRES', secondary);

  // ── Persona métier ──────────────────────────────────────────
  // Champs possibles selon le secteur : courtier_persona_fr,
  // professional_persona_fr, persona_fr…
  const persona =
    profile.courtier_persona_fr ||
    profile.professional_persona_fr ||
    profile.persona_fr;
  pushSection('PERSONA DU PROFESSIONNEL', persona);

  // ── Cadre réglementaire ─────────────────────────────────────
  if (Array.isArray(profile.regulatory_framework) && profile.regulatory_framework.length) {
    const text = profile.regulatory_framework
      .map((r) => {
        const name = r?.name || r?.id || '';
        const desc = (r?.description_fr || '').trim();
        if (!name && !desc) return '';
        return desc ? `${name} — ${desc}` : name;
      })
      .filter(Boolean)
      .join('\n\n');
    if (text) pushSection('CADRE RÉGLEMENTAIRE', text);
  }

  // ── Écosystème d'outils métier (non-IA) ─────────────────────
  if (Array.isArray(profile.industry_specific_tools) && profile.industry_specific_tools.length) {
    const text = profile.industry_specific_tools
      .map((t) => {
        const name = t?.name || t?.id || '';
        const type = t?.type ? ` (${t.type})` : '';
        return name ? `${name}${type}` : '';
      })
      .filter(Boolean)
      .join('\n');
    if (text) pushSection("ÉCOSYSTÈME D'OUTILS MÉTIER", text);
  }

  // ── Outils IA spécifiques (tier 1 + 2) ──────────────────────
  if (Array.isArray(profile.ai_specific_tools) && profile.ai_specific_tools.length) {
    const text = profile.ai_specific_tools
      .filter((t) => t?.tier === 1 || t?.tier === 2)
      .map((t) => {
        const name = t?.name || t?.id || '';
        const seg = (t?.target_segment_fr || '').trim();
        if (!name) return '';
        return seg ? `${name} : ${seg}` : name;
      })
      .filter(Boolean)
      .join('\n');
    if (text) pushSection('OUTILS IA SPÉCIFIQUES', text);
  }

  // ── Pain points sectoriels ──────────────────────────────────
  if (Array.isArray(profile.sector_specific_pain_points) && profile.sector_specific_pain_points.length) {
    const text = profile.sector_specific_pain_points
      .map((p) => {
        const pain = (p?.pain_fr || '').trim();
        const desc = (p?.description_fr || '').trim();
        if (!pain) return '';
        return desc ? `${pain} — ${desc}` : pain;
      })
      .filter(Boolean)
      .join('\n\n');
    if (text) pushSection('PAIN POINTS', text);
  }

  // ── KPIs sectoriels (objet de listes aplaties) ──────────────
  if (profile.sectoral_kpis && typeof profile.sectoral_kpis === 'object') {
    const flat = [];
    for (const [group, kpis] of Object.entries(profile.sectoral_kpis)) {
      if (Array.isArray(kpis) && kpis.length) {
        flat.push(`${group}: ${kpis.join(', ')}`);
      }
    }
    if (flat.length) pushSection('KPIs SECTORIELS', flat.join('\n'));
  }

  // ── Risques sectoriels ──────────────────────────────────────
  if (Array.isArray(profile.sector_risks) && profile.sector_risks.length) {
    const text = profile.sector_risks
      .map((r) => {
        const title = (r?.title_fr || '').trim();
        const desc = (r?.description_fr || '').trim();
        if (!title) return '';
        return desc ? `${title} — ${desc}` : title;
      })
      .filter(Boolean)
      .join('\n\n');
    if (text) pushSection('RISQUES SECTORIELS', text);
  }

  // ── Assemblage avec troncature douce ────────────────────────
  let total = 0;
  const kept = [];
  for (const section of sections) {
    const len = section.length + (kept.length ? 2 : 0);
    if (total + len > EMBEDDING_SOURCE_MAX_CHARS) {
      const remaining = EMBEDDING_SOURCE_MAX_CHARS - total - (kept.length ? 2 : 0);
      if (remaining > 200) {
        kept.push(section.slice(0, remaining - 1) + '…');
      }
      break;
    }
    kept.push(section);
    total += len;
  }

  return kept.join('\n\n');
}

/**
 * Construit le tableau industry_keywords pour un profil.
 * Priorité : champ YAML industry_match_keywords > fallback par id.
 */
function buildIndustryKeywords(profile) {
  if (Array.isArray(profile.industry_match_keywords) && profile.industry_match_keywords.length) {
    return [...new Set(profile.industry_match_keywords.filter(Boolean))];
  }
  const fallback = INDUSTRY_KEYWORDS_FALLBACK[profile.id];
  if (fallback) return [...fallback];
  console.warn(
    `⚠️  Aucun industry_match_keywords ni fallback pour ${profile.id} — tableau vide`,
  );
  return [];
}

/**
 * Génère un embedding via l'API Voyage. Retry 22s × tentative sur 429.
 */
async function generateEmbedding(text, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(VOYAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [text],
        model: EMBEDDING_MODEL,
        input_type: 'document',
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return json.data[0].embedding;
    }

    const body = await res.text();

    if (res.status === 429 && attempt < maxRetries) {
      const waitMs = 22000 * (attempt + 1);
      console.log(
        `   ⏳ 429 rate limit. Attente ${waitMs / 1000}s avant retry (${attempt + 1}/${maxRetries})…`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    throw new Error(`Voyage API ${res.status} : ${body}`);
  }
}

async function loadAllProfiles() {
  const files = await fs.readdir(SECTOR_PROFILES_DIR);
  const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  console.log(`📁 ${yamlFiles.length} fichiers YAML trouvés dans ${SECTOR_PROFILES_DIR}`);

  const profiles = [];
  for (const file of yamlFiles) {
    const filePath = path.join(SECTOR_PROFILES_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');
    try {
      const parsed = yaml.load(content);
      profiles.push({ ...parsed, _sourceFile: file });
    } catch (err) {
      console.error(`❌ Erreur parsing YAML ${file} :`, err.message);
    }
  }
  return profiles;
}

function validateProfile(profile) {
  const required = ['id', 'title_fr', 'version'];
  const missing = required.filter((f) => !profile[f]);
  if (missing.length > 0) return `Champs manquants : ${missing.join(', ')}`;
  if (profile.type && profile.type !== 'profil-sectoriel') {
    return `Type invalide : ${profile.type} (attendu : profil-sectoriel)`;
  }
  return null;
}

async function upsertProfile(profile, embedding, embeddingSource, industryKeywords) {
  const payload = {
    id: profile.id,
    content: profile,
    title_fr: profile.title_fr,
    type: profile.type || 'profil-sectoriel',
    version: profile.version,
    language: profile.language || 'fr',
    industry_keywords: industryKeywords,
    embedding_source: embeddingSource,
    embedding,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('sector_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, title_fr');

  if (error) {
    throw new Error(`Erreur upsert ${profile.id} : ${error.message}`);
  }
  return data[0];
}

// ─────────────────────────────────────────────────────────────
// SCRIPT PRINCIPAL
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  SEED SECTOR PROFILES — 5PennyAi Audit IA             ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const profiles = await loadAllProfiles();
  console.log(`\n📚 ${profiles.length} profils sectoriels chargés\n`);

  const valid = [];
  for (const profile of profiles) {
    const error = validateProfile(profile);
    if (error) {
      console.warn(`⚠️  ${profile._sourceFile || profile.id} : ${error}`);
    } else {
      valid.push(profile);
    }
  }

  console.log(`✅ ${valid.length} profils valides\n`);

  if (valid.length === 0) {
    console.error('❌ Aucun profil valide à seeder.');
    process.exit(1);
  }

  const results = { success: 0, failed: 0, errors: [] };

  for (const [idx, profile] of valid.entries()) {
    const progress = `[${idx + 1}/${valid.length}]`;

    try {
      console.log(`${progress} 🔄 ${profile.id}`);

      const industryKeywords = buildIndustryKeywords(profile);
      console.log(
        `${progress}   → industry_keywords (${industryKeywords.length}) : ${industryKeywords.join(', ')}`,
      );

      const embeddingSource = buildEmbeddingSource(profile);
      console.log(`${progress}   → Génération embedding (${embeddingSource.length} chars)`);

      const embedding = await generateEmbedding(embeddingSource);

      if (embedding.length !== EMBEDDING_DIMS) {
        throw new Error(
          `Dimension inattendue : ${embedding.length} (attendu ${EMBEDDING_DIMS}).`,
        );
      }

      const inserted = await upsertProfile(profile, embedding, embeddingSource, industryKeywords);
      console.log(`${progress}   ✅ Upserté : ${inserted.title_fr}`);

      results.success++;

      await new Promise((r) => setTimeout(r, VOYAGE_REQUEST_DELAY_MS));
    } catch (error) {
      console.error(`${progress}   ❌ Erreur : ${error.message}`);
      results.failed++;
      results.errors.push({ profile: profile.id, error: error.message });
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  RAPPORT FINAL                                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n✅ Succès    : ${results.success}`);
  console.log(`❌ Échecs    : ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nDétail des erreurs :');
    for (const err of results.errors) {
      console.log(`  - ${err.profile} : ${err.error}`);
    }
  }

  const { count, error } = await supabase
    .from('sector_profiles')
    .select('*', { count: 'exact', head: true });

  if (!error) {
    console.log(`\n📊 Total sector_profiles dans Supabase : ${count}\n`);
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale :', err);
  process.exit(1);
});
