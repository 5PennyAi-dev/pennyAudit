// Charge les prompts .md depuis le dossier src/prompts/.
// Utilisé côté serveur uniquement (fs.readFileSync).
//
// Déploiement Vercel : ces fichiers sont tracés automatiquement par
// @vercel/nft grâce au chemin statique ci-dessous. Si jamais ils ne sont
// pas inclus dans le bundle serverless, ajouter un `includeFiles` dans
// vercel.json (section functions).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SkillId } from '../lib/ai/config';

const here = path.dirname(fileURLToPath(import.meta.url));

const cache = new Map<SkillId, string>();

export function loadSkillPrompt(id: SkillId): string {
  const cached = cache.get(id);
  if (cached) return cached;
  const file = path.join(here, `skill-${id}.md`);
  const content = fs.readFileSync(file, 'utf-8');
  cache.set(id, content);
  return content;
}
