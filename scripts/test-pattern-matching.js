/**
 * Tests ad-hoc du matching sémantique des patterns.
 * Session 2F — Étape 6.
 *
 * Pour chaque query, génère un embedding Voyage-3 (inputType='query'),
 * appelle la RPC match_patterns_voyage3, log le top-3 avec scores, et
 * vérifie que le pattern attendu est dans le top-3 (idéalement top-1).
 *
 * Usage : node scripts/test-pattern-matching.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !VOYAGE_API_KEY) {
  console.error('❌ Variables manquantes (.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const VOYAGE_REQUEST_DELAY_MS = Number(process.env.VOYAGE_REQUEST_DELAY_MS ?? 200);

async function generateQueryEmbedding(text) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [text],
      model: 'voyage-3',
      input_type: 'query',
    }),
  });
  if (!res.ok) {
    throw new Error(`Voyage API ${res.status} : ${await res.text()}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

const tests = [
  // Test A — patterns existants
  { id: 'A1', query: "Je suis plombier et je rate trop d'appels", expected: 'ai-voice-receptionist' },
  { id: 'A2', query: 'Je veux un chatbot sur mon site web pour qualifier les visiteurs', expected: 'ai-text-chatbot-multichannel' },
  { id: 'A3', query: "Mes clients ont du mal à prendre rendez-vous, je perds des occasions", expected: 'ai-appointment-scheduling' },
  { id: 'A4', query: 'Je passe trop de temps à rédiger du contenu pour les réseaux sociaux', expected: 'ai-marketing-content-creation' },
  { id: 'A5', query: 'Ma boîte courriel déborde, je ne sais plus où donner de la tête', expected: 'ai-email-management' },

  // Test B — nouveaux patterns
  { id: 'B1', query: 'Je passe des soirées à monter mes devis et factures à la main', expected: 'ai-quote-invoice-automation' },
  { id: 'B2', query: "Mes réunions client durent une heure et je n'ai jamais le temps de prendre des notes", expected: 'ai-meeting-transcription-summary' },
  { id: 'B3', query: 'Je gère trois restaurants, le recrutement me prend tout mon temps', expected: 'ai-hr-recruitment-automation' },
  { id: 'B4', query: "J'ai des données partout dans mes fichiers Excel, je ne vois plus rien", expected: 'ai-data-dashboards' },
  { id: 'B5', query: 'Mes clients me posent toujours les mêmes questions, ça épuise mon équipe support', expected: 'ai-customer-support-helpdesk' },

  // Test C — cas immobilier (top-3)
  { id: 'C1', query: 'Je suis courtier immobilier, je perds des leads quand je suis en visite', expected: 'ai-voice-receptionist', topN: 3 },
];

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST MATCHING SÉMANTIQUE — Session 2F                ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  let passed = 0;
  const fails = [];

  for (const t of tests) {
    const topN = t.topN || 1;
    const embedding = await generateQueryEmbedding(t.query);
    const { data, error } = await supabase.rpc('match_patterns_voyage3', {
      query_embedding: embedding,
      match_threshold: 0.0,
      match_count: 3,
    });

    if (error) {
      console.log(`[${t.id}] ❌ RPC error : ${error.message}`);
      fails.push({ ...t, reason: 'RPC error' });
      continue;
    }

    const top3 = (data || []).slice(0, 3);
    const top3Ids = top3.map((r) => r.id);
    const rank = top3Ids.indexOf(t.expected); // 0,1,2 ou -1
    const ok = rank !== -1 && rank < topN;

    console.log(`\n[${t.id}] ${ok ? '✅' : '❌'} "${t.query}"`);
    console.log(`     attendu : ${t.expected} (top-${topN})`);
    for (const [i, r] of top3.entries()) {
      const marker = r.id === t.expected ? '  ⭐' : '';
      console.log(`     #${i + 1}  ${r.similarity.toFixed(4)}  ${r.id}${marker}`);
    }

    if (ok) {
      passed++;
    } else {
      fails.push({ ...t, top3Ids, reason: rank === -1 ? 'absent du top-3' : `rank ${rank + 1} (top-${topN} requis)` });
    }

    await new Promise((r) => setTimeout(r, VOYAGE_REQUEST_DELAY_MS));
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  RÉSUMÉ                                               ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\nTests passés : ${passed} / ${tests.length}`);
  if (fails.length) {
    console.log('\nÉchecs :');
    for (const f of fails) {
      console.log(`  - [${f.id}] ${f.expected} : ${f.reason}`);
      if (f.top3Ids) console.log(`        top-3 obtenu : ${f.top3Ids.join(', ')}`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale :', err);
  process.exit(1);
});
