/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRIPT DE SEED — Librairie de patterns IA
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Usage :
 *   node scripts/seed-patterns.js
 *
 * Ce script :
 *   1. Lit tous les fichiers YAML dans le dossier /patterns/
 *   2. Extrait les champs clés pour la DB
 *   3. Génère un embedding vectoriel pour chaque pattern (Voyage AI)
 *   4. Insère (ou met à jour) dans Supabase
 *
 * Dépendances npm à installer :
 *   npm install @supabase/supabase-js voyageai js-yaml dotenv
 *
 * Variables d'environnement requises (.env à la racine du projet) :
 *   SUPABASE_URL=https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... (PAS la anon key, la service role key)
 *   VOYAGE_API_KEY=pa-...
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

const PATTERNS_DIR = path.resolve('./patterns');
// Accepte SUPABASE_URL ou VITE_SUPABASE_URL (partagé avec le client React)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

// Modèle d'embedding : voyage-3 (1024 dims) ou voyage-3-large (1024 dims)
// Note : si tu changes de modèle, ajuste le VECTOR(N) dans le schéma SQL
const EMBEDDING_MODEL = 'voyage-3';
const EMBEDDING_DIMS = 1024;

// ─────────────────────────────────────────────────────────────
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ─────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env');
  console.error('   Récupère la SERVICE_ROLE_KEY (pas la ANON) dans les paramètres Supabase.');
  process.exit(1);
}

if (!VOYAGE_API_KEY) {
  console.error('❌ VOYAGE_API_KEY est requis. Crée un compte sur https://voyageai.com');
  console.error('   Alternative : adapter ce script pour utiliser OpenAI embeddings.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const VOYAGE_ENDPOINT = 'https://api.voyageai.com/v1/embeddings';

// Délai entre requêtes Voyage pour respecter les rate limits.
// Compte free sans CC : 3 RPM → 21000 ms. Compte avec CC : 300 RPM → 200 ms suffit.
// Override via env : VOYAGE_REQUEST_DELAY_MS=21000 npm run seed:patterns
const VOYAGE_REQUEST_DELAY_MS = Number(
  process.env.VOYAGE_REQUEST_DELAY_MS ?? 200,
);

// ─────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────────────────────

// Limite douce du texte embeddé (Voyage-3 accepte ~16k tokens, on garde
// une marge confortable et on évite de noyer le signal sémantique).
const EMBEDDING_SOURCE_MAX_CHARS = 10000;

/**
 * Construit le texte qui sera embeddé pour un pattern.
 *
 * Stratégie :
 *   - Sections nommées en français (TITRE, RÉSUMÉ, PROBLÈME, SOLUTION, …)
 *     pour aider Voyage-3 à interpréter la sémantique.
 *   - Sections optionnelles : si le champ est absent du YAML on saute
 *     la section sans crasher (les patterns récents ont plus de champs
 *     que les patterns initiaux).
 *   - Sections ordonnées par priorité décroissante : si on dépasse
 *     EMBEDDING_SOURCE_MAX_CHARS, on tronque les sections de queue
 *     (industries/capacités/outils restent moins critiques que le
 *     pain point ou la solution).
 */
function buildEmbeddingSource(pattern) {
  const sections = [];

  const pushSection = (label, value) => {
    if (!value) return;
    const text = String(value).trim();
    if (!text) return;
    sections.push(`${label} :\n${text}`);
  };

  const joinList = (list, sep = ', ') =>
    Array.isArray(list) ? list.filter(Boolean).join(sep) : '';

  // ── Identité du pattern ──────────────────────────────────────
  pushSection('TITRE', pattern.title_fr);
  pushSection('CATÉGORIE', pattern.category);

  // ── Résumés ──────────────────────────────────────────────────
  pushSection('RÉSUMÉ', pattern.summary_short_fr);
  pushSection('DESCRIPTION', pattern.summary_long_fr);

  // ── Le cœur sémantique : problème + solution ─────────────────
  pushSection('PROBLÈME TYPE', pattern.pain_point_fr);
  pushSection('SOLUTION', pattern.solution_summary_fr);

  // ── Cibles ───────────────────────────────────────────────────
  const industries = joinList(pattern.target_industries);
  if (industries) pushSection('INDUSTRIES CIBLES', industries);

  const sizes = joinList(pattern.target_business_sizes);
  if (sizes) pushSection('TAILLES CIBLES', sizes);

  const segments = joinList(pattern.high_priority_segments);
  if (segments) pushSection('SEGMENTS PRIORITAIRES', segments);

  // ── Capacités ───────────────────────────────────────────────
  const capabilities = joinList(pattern.typical_capabilities, '. ');
  if (capabilities) pushSection('CAPACITÉS', capabilities);

  // ── Modes de déploiement (name_fr + description_fr) ─────────
  if (Array.isArray(pattern.deployment_modes) && pattern.deployment_modes.length) {
    const modesText = pattern.deployment_modes
      .map((m) => {
        const name = m?.name_fr || m?.id || '';
        const desc = (m?.description_fr || '').trim();
        if (!name && !desc) return '';
        return desc ? `${name} — ${desc}` : name;
      })
      .filter(Boolean)
      .join('\n\n');
    if (modesText) pushSection('MODES DE DÉPLOIEMENT', modesText);
  }

  // ── Outils Tier 1 (name + target_segment_fr) ────────────────
  if (Array.isArray(pattern.tools) && pattern.tools.length) {
    const tier1 = pattern.tools
      .filter((t) => t?.tier === 1)
      .map((t) => {
        const name = t?.name || t?.id || '';
        const seg = (t?.target_segment_fr || '').trim();
        if (!name) return '';
        return seg ? `${name} : ${seg}` : name;
      })
      .filter(Boolean)
      .join('\n');
    if (tier1) pushSection('OUTILS PRINCIPAUX', tier1);
  }

  // ── Cas d'usage couverts par les implementation_templates ───
  // Stratégie : on n'injecte QUE les use_case_fr et keywords des
  // triggers_when. Le contenu détaillé (voie_a_self_serve,
  // voie_b_accompagnee, pitfalls, workflow…) noierait le signal.
  if (
    Array.isArray(pattern.implementation_templates) &&
    pattern.implementation_templates.length > 0
  ) {
    const lines = [];
    for (const tmpl of pattern.implementation_templates) {
      if (tmpl?.use_case_fr) {
        lines.push(`- ${String(tmpl.use_case_fr).trim()}`);
      }
      const kw = tmpl?.triggers_when?.automation_wish_keywords;
      if (Array.isArray(kw) && kw.length) {
        lines.push(`  Mots-clés associés : ${kw.join(', ')}`);
      }
      const inds = tmpl?.triggers_when?.industry_in;
      if (Array.isArray(inds) && inds.length) {
        lines.push(`  Industries spécifiques : ${inds.join(', ')}`);
      }
    }
    if (lines.length) pushSection("CAS D'USAGE COUVERTS", lines.join('\n'));
  }

  // Assemblage avec troncature douce : on conserve les sections en
  // ordre, et on coupe net dès qu'on dépasse la limite.
  let total = 0;
  const kept = [];
  for (const section of sections) {
    const len = section.length + (kept.length ? 2 : 0); // +2 pour \n\n
    if (total + len > EMBEDDING_SOURCE_MAX_CHARS) {
      // Si la section ne rentre pas, on essaye de la tronquer
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
 * Génère un embedding vectoriel pour un texte donné via l'API REST Voyage.
 * Retry automatique sur 429 (rate limit) avec backoff 22 s × tentatives.
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

    // Rate limit : attendre et réessayer
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

/**
 * Lit tous les fichiers YAML dans le dossier des patterns.
 */
async function loadAllPatterns() {
  const files = await fs.readdir(PATTERNS_DIR);
  const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  console.log(`📁 ${yamlFiles.length} fichiers YAML trouvés dans ${PATTERNS_DIR}`);

  const patterns = [];

  for (const file of yamlFiles) {
    const filePath = path.join(PATTERNS_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');

    try {
      const parsed = yaml.load(content);
      patterns.push({ ...parsed, _sourceFile: file });
    } catch (err) {
      console.error(`❌ Erreur parsing YAML ${file} :`, err.message);
    }
  }

  return patterns;
}

/**
 * Valide qu'un pattern a tous les champs requis minimum.
 */
function validatePattern(pattern) {
  const required = ['id', 'title_fr', 'version', 'summary_long_fr'];
  const missing = required.filter(field => !pattern[field]);

  if (missing.length > 0) {
    return `Champs manquants : ${missing.join(', ')}`;
  }

  return null;
}

/**
 * Insère ou met à jour un pattern dans Supabase.
 */
async function upsertPattern(pattern, embedding, embeddingSource) {
  const payload = {
    id: pattern.id,
    content: pattern,  // Le YAML complet en JSON
    title_fr: pattern.title_fr,
    title_en: pattern.title_en || null,
    category: pattern.category || null,
    version: pattern.version,
    target_industries: pattern.target_industries || [],
    target_business_sizes: pattern.target_business_sizes || [],
    tech_comfort_required: pattern.tech_comfort_required || null,
    embedding_source: embeddingSource,
    embedding: embedding,
    confidence_level: pattern.confidence_level || 'medium',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('patterns')
    .upsert(payload, { onConflict: 'id' })
    .select('id, title_fr');

  if (error) {
    throw new Error(`Erreur upsert ${pattern.id} : ${error.message}`);
  }

  return data[0];
}

// ─────────────────────────────────────────────────────────────
// SCRIPT PRINCIPAL
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  SEED PATTERNS — 5PennyAi Audit IA                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // 1. Charger tous les patterns
  const patterns = await loadAllPatterns();
  console.log(`\n📚 ${patterns.length} patterns chargés depuis le disque\n`);

  // 2. Valider et filtrer
  const validPatterns = [];
  for (const pattern of patterns) {
    const error = validatePattern(pattern);
    if (error) {
      console.warn(`⚠️  ${pattern._sourceFile || pattern.id} : ${error}`);
    } else {
      validPatterns.push(pattern);
    }
  }

  console.log(`✅ ${validPatterns.length} patterns valides\n`);

  if (validPatterns.length === 0) {
    console.error('❌ Aucun pattern valide à seeder.');
    process.exit(1);
  }

  // 3. Traiter chaque pattern
  const results = { success: 0, failed: 0, errors: [] };

  for (const [idx, pattern] of validPatterns.entries()) {
    const progress = `[${idx + 1}/${validPatterns.length}]`;

    try {
      console.log(`${progress} 🔄 ${pattern.id}`);

      // 3a. Construire le texte à embedder
      const embeddingSource = buildEmbeddingSource(pattern);

      // 3b. Générer l'embedding
      console.log(`${progress}   → Génération embedding (${embeddingSource.length} chars)`);
      const embedding = await generateEmbedding(embeddingSource);

      // 3c. Valider la dimension
      if (embedding.length !== EMBEDDING_DIMS) {
        throw new Error(
          `Dimension inattendue : ${embedding.length} (attendu ${EMBEDDING_DIMS}). ` +
          `Ajuste le VECTOR(N) dans le schéma SQL.`
        );
      }

      // 3d. Upsert dans Supabase
      const inserted = await upsertPattern(pattern, embedding, embeddingSource);
      console.log(`${progress}   ✅ Inséré : ${inserted.title_fr}`);

      results.success++;

      // Délai entre requêtes pour respecter les rate limits Voyage
      await new Promise((resolve) =>
        setTimeout(resolve, VOYAGE_REQUEST_DELAY_MS),
      );

    } catch (error) {
      console.error(`${progress}   ❌ Erreur : ${error.message}`);
      results.failed++;
      results.errors.push({ pattern: pattern.id, error: error.message });
    }
  }

  // 4. Rapport final
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  RAPPORT FINAL                                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n✅ Succès    : ${results.success}`);
  console.log(`❌ Échecs    : ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nDétail des erreurs :');
    for (const err of results.errors) {
      console.log(`  - ${err.pattern} : ${err.error}`);
    }
  }

  // 5. Vérification finale : compter dans la DB
  const { count, error } = await supabase
    .from('patterns')
    .select('*', { count: 'exact', head: true });

  if (!error) {
    console.log(`\n📊 Total patterns dans Supabase : ${count}\n`);
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────
// EXÉCUTION
// ─────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('\n💥 Erreur fatale :', err);
  process.exit(1);
});
