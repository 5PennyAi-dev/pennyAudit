/**
 * Migration one-shot du pattern 004 :
 *   patterns/pattern-004-redaction-contenu-marketing.yaml (intégré)
 *     →
 *   patterns/pattern-004-redaction-contenu-marketing/
 *     ├── _pattern.yaml
 *     ├── fiches-centris-immobilier.yaml
 *     ├── newsletters-nurturing.yaml
 *     └── posts-sociaux-blog.yaml
 *
 * Ce script est destructif (supprime le fichier source).
 * Le rollback se fait via le tag git pre-session-2j-refactoring
 * ou le backup .backup-pre-2j.
 *
 * Usage : node scripts/session-2j-migrate-004.js
 */
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const SOURCE = path.resolve('./patterns/pattern-004-redaction-contenu-marketing.yaml');
const TARGET_DIR = path.resolve('./patterns/pattern-004-redaction-contenu-marketing');

const raw = await fs.readFile(SOURCE, 'utf8');
const parsed = yaml.load(raw);

if (!Array.isArray(parsed.implementation_templates)) {
  throw new Error('Pattern 004 ne contient pas implementation_templates en tableau');
}

const templates = parsed.implementation_templates;
console.log(`Pattern 004 : ${templates.length} sous-templates détectés`);
for (const t of templates) {
  if (!t.id) throw new Error('Sous-template sans id détecté — abort');
  console.log(`  - ${t.id}`);
}

// 1. Crée le dossier cible
await fs.mkdir(TARGET_DIR, { recursive: true });

// 2. Construit le _pattern.yaml (sans implementation_templates*)
const baseClone = { ...parsed };
delete baseClone.implementation_templates;
delete baseClone.implementation_templates_notes_fr;

const dumpOpts = {
  lineWidth: 200,
  noRefs: true,
  sortKeys: false,
  forceQuotes: false,
};

const baseYaml = yaml.dump(baseClone, dumpOpts);
await fs.writeFile(path.join(TARGET_DIR, '_pattern.yaml'), baseYaml, 'utf8');
console.log(`✅ Écrit : _pattern.yaml (${baseYaml.length} chars)`);

// 3. Écrit chaque sous-template dans son propre fichier
for (const tmpl of templates) {
  const fileName = `${tmpl.id}.yaml`;

  // Reconstruit l'objet avec `type` en première position
  const ordered = { type: 'implementation_template', ...tmpl };

  const subYaml = yaml.dump(ordered, dumpOpts);
  await fs.writeFile(path.join(TARGET_DIR, fileName), subYaml, 'utf8');
  console.log(`✅ Écrit : ${fileName} (${subYaml.length} chars)`);
}

// 4. Validation YAML stricte sur les 4 fichiers produits
const produced = await fs.readdir(TARGET_DIR);
console.log(`\nValidation YAML sur ${produced.length} fichiers :`);
for (const f of produced.sort()) {
  const content = await fs.readFile(path.join(TARGET_DIR, f), 'utf8');
  try {
    const data = yaml.load(content);
    if (!data || typeof data !== 'object') throw new Error('non-objet');
    console.log(`  ✓ ${f}`);
  } catch (e) {
    throw new Error(`Validation YAML échouée pour ${f} : ${e.message}`);
  }
}

// 5. Validation logique
const baseLoaded = yaml.load(await fs.readFile(path.join(TARGET_DIR, '_pattern.yaml'), 'utf8'));
if (baseLoaded.implementation_templates !== undefined) {
  throw new Error('_pattern.yaml contient encore implementation_templates');
}
console.log('✓ _pattern.yaml ne contient plus implementation_templates');

const seenIds = new Set();
for (const f of produced) {
  if (f === '_pattern.yaml') continue;
  const data = yaml.load(await fs.readFile(path.join(TARGET_DIR, f), 'utf8'));
  if (data.type !== 'implementation_template') {
    throw new Error(`${f} : type != implementation_template`);
  }
  if (!data.id) throw new Error(`${f} : id manquant`);
  if (seenIds.has(data.id)) throw new Error(`${f} : id dupliqué (${data.id})`);
  seenIds.add(data.id);
}
console.log(`✓ ${seenIds.size} sous-templates avec ids distincts et type valide`);

// 6. Suppression de l'ancien fichier intégré
await fs.unlink(SOURCE);
console.log(`\n🗑  Supprimé : pattern-004-redaction-contenu-marketing.yaml`);
console.log('   (rollback possible via .backup-pre-2j ou tag git pre-session-2j-refactoring)\n');

console.log('Migration terminée avec succès.');
