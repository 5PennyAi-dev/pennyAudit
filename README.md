# pennyAudit

Outil d'audit IA 5PennyAi — React 19 + Vite + TypeScript + Supabase + Vercel.

## Démarrer en local

```bash
cp .env.example .env        # remplir les clés (voir .env.example)
npm install
npm run dev                 # front Vite sur http://localhost:5173
npx vercel dev              # équivalent + endpoints api/*
```

## Tester le formulaire d'intake (Session 2A)

1. Aller sur `http://localhost:5173/intake`
2. Remplir les 7 écrans. À chaque transition d'écran, un save progressif est
   appelé sur `POST /api/intake/save` — vérifier dans Supabase qu'une ligne
   `audits` avec `status='draft'` est créée (écran 1 → 2) puis mise à jour.
3. Rafraîchir la page : les données sont rechargées depuis `localStorage`.
4. Tester la reprise par lien :
   - Déclencher `POST /api/intake/send-resume-link` avec `{ auditId, email }`.
   - En mode dev (sans `RESEND_API_KEY`), le `resumeUrl` est retourné dans la
     réponse JSON (au lieu d'être envoyé par courriel).
   - Ouvrir `/intake/resume/<token>` → redirige vers l'écran où l'utilisateur
     en était, données intactes.
5. À l'écran 7, le clic sur « Lancer mon audit » appelle
   `POST /api/audit/run` et redirige vers `/audit/progress/:auditId` où
   les 4 étapes de production s'animent en temps réel (voir Session 2B).

## Variables d'environnement

Voir `.env.example`. Nouvelles en Session 2A :
- `RESEND_API_KEY`, `RESEND_FROM` — envoi des courriels de reprise
- `RESUME_TOKEN_SECRET` — secret HMAC pour signer les tokens (fallback :
  `SUPABASE_SERVICE_ROLE_KEY`)
- `PUBLIC_BASE_URL` — base URL utilisée dans les liens de reprise
- `CRON_SECRET` — bearer token exigé par les endpoints `/api/cron/*`

Nouvelles en Session 2B :
- `ADMIN_EMAIL`, `ADMIN_NAME` — destinataire des courriels admin
- `RESEND_FROM_CLIENT` — expéditeur personnel (Christian) pour le courriel
  client de fin de pipeline ; fallback sur `RESEND_FROM` (no-reply)
- `INTERNAL_HOOK_SECRET` — bearer des appels internes orchestrateur →
  `/api/audit/send-completion-emails` ; fallback sur `CRON_SECRET`

Nouvelles en Session 2C :
- `ADMIN_PASSWORD` — mot de passe d'accès à `/admin/*` (long, jamais commit)
- `ADMIN_SESSION_SECRET` — secret HMAC pour signer le cookie admin
  (32+ caractères, distinct des autres secrets)
- `ADMIN_SESSION_DURATION_HOURS` — durée du cookie (défaut 12 h)
- `REPORT_TOKEN_SECRET` — secret HMAC pour les tokens de rapport public
  (fallback `RESUME_TOKEN_SECRET` puis `SUPABASE_SERVICE_ROLE_KEY`)

## Réviser un audit (Session 2C)

1. Aller sur `/admin/audits` → page de login → saisir `ADMIN_PASSWORD`.
2. La liste affiche par défaut les audits en `pending_review`. Filtres :
   multi-statut, recherche par prénom/courriel, tri par colonne, persistance
   dans le querystring.
3. Cliquer « Réviser → » sur un audit. La page détail expose 7 onglets :
   Intake, Contexte, Opportunités, Risques, Stack, Rapport final, Notes &
   historique. Chaque onglet de section a un éditeur de note inline en bas
   (auto-save 1.5 s, indicateur d'état).
4. Trois actions sur le bandeau :
   - **Approuver et envoyer** → modal de confirmation → génère un JWT
     (90 jours), update `status='delivered'`, envoie courriel client (ou
     log console en mode dev sans `RESEND_API_KEY`).
   - **Demander des modifications** → modal avec raison → `status` →
     `changes_requested`. Le bouton « Relancer le pipeline » apparaît
     ensuite : backup automatique des outputs précédents dans un event,
     puis déclenche `/api/audit/run` en fire-and-forget.
   - **Rejeter** → modal avec checkbox de confirmation → `status='rejected'`.
5. La page rapport publique `/rapport/:token` est accessible sans auth via
   le lien envoyé au client. Bouton « Imprimer » sur la page → PDF
   navigateur (CSS print A4 dédié).

## Génération DOCX (Session 2D)

Chaque audit livré est aussi disponible en `.docx` (palette Navy/Orange/Cream,
12-15 pages, identique au rendu de la page web).

**Stockage** : bucket Supabase Storage privé `audit-reports`. Accès via
`SUPABASE_SERVICE_ROLE_KEY` uniquement, jamais public. Chemin :
`<audit_id>/audit-<slug-client>-<timestamp>.docx`. Chaque régénération
écrit un nouveau blob (historique implicite par timestamp ; cleanup
manuel pour l'instant).

**Génération automatique** : à l'approbation (« Approuver et envoyer »),
le DOCX est généré, uploadé, puis joint au courriel client (en plus
du lien web qui reste valide 90 jours). Si la génération ou l'upload
échoue, le flux entier est annulé — l'audit reste en `pending_review`
pour réessai (pas d'envoi sans pièce jointe).

**Génération manuelle / régénération depuis l'admin** : sur la page
détail d'un audit (`/admin/audits/<id>`), bandeau « Rapport DOCX »
sous le header :
- Si aucun DOCX : bouton **Générer DOCX**.
- Si DOCX existant : boutons **Télécharger** (URL signée 15 min) et
  **Régénérer** (utile après avoir édité une note de section pour
  resynchroniser le livrable). Indicateur de fraîcheur (« Généré il
  y a X min/h/j »).

**Mode dev** : si `RESEND_API_KEY` est absent, la console log la taille
de la pièce jointe sans dump du buffer ; le DOCX est tout de même
stocké dans le bucket Storage et accessible via le bouton Télécharger.

**Endpoints** :
- `POST /api/admin/audits/[id]/generate-docx` — génère + upload + URL
  signée, met à jour `audits.docx_storage_path` et
  `audits.docx_generated_at`, émet un event `docx_generated`.
- `GET /api/admin/audits/[id]/docx-url` — retourne une URL signée
  fraîche (15 min) sans rien régénérer.

**Debug local** : `npx tsx scripts/test-docx-build.ts [auditId]` génère
les DOCX dans `tmp/` à partir des audits en `pending_review` /
`delivered` (ou un audit ciblé). Sert à valider le builder sans
déployer.

**Affirmation de révision** : la phrase « révisé personnellement par
Christian Couillard » n'apparaît dans le mot de clôture (DOCX) et le
footer (page web) que si `audits.reviewed_at` est non null ET que
`audits.admin_notes_global` est non vide. Les `reviewer_notes` par
section ne sont pas considérées (pré-remplies par l'IA, donc inutilisables
comme signal). Pour activer la phrase : laisse une note globale dans
l'onglet « Notes & historique » de l'admin avant d'approuver.

## Génération de diagrammes (Session 2E)

À la fin du pipeline d'audit (après le Skill 5, avant le passage en
`pending_review`), un Skill 6 produit un prompt Gemini par opportunité
**phase 1 et phase 2** de la feuille de route, puis le pipeline appelle
`gemini-3-pro-image-preview` (Nano Banana Pro) en parallèle (3 appels
concurrents max, timeout 90s par appel) avec la planche
`docs/references/style-guide-v1.png` jointe à chaque appel. Les PNG/JPEG
résultants sont uploadés dans le bucket privé `audit-diagrams`
(`<audit_id>/<solution_id>.{png|jpg}`) et tracés dans
`audits.diagrams_metadata` (jsonb).

**Ordre de magnitude** : 3-4 diagrammes par audit, ~5 min de génération
totale (sous parallélisme 3), ~0,54 $ US par audit.

**Pas de Mermaid en fallback** : si Gemini échoue après les 2 retries
internes, l'audit passe quand même en `pending_review` sans le
diagramme concerné. L'admin peut le régénérer depuis l'onglet Rapport.

**Régénération admin** : dans l'onglet Rapport d'un audit, le panneau
« Diagrammes d'architecture » affiche chaque diagramme avec son statut,
un aperçu, et trois boutons (Voir en grand / Éditer le prompt /
Régénérer). L'édition du prompt ouvre une modal avec textarea
préremplie ; soumettre régénère via
`POST /api/admin/audits/:id/diagrams/:solution_id/regenerate`. Le
nouveau diagramme écrase l'ancien au même path Storage (pas de
versioning).

**Test local du pipeline diagrammes** (sans repasser tout le pipeline
d'audit) :

```bash
# Génère ou régénère tous les diagrammes d'un audit existant.
# Sans argument : utilise le pending_review le plus récent.
npx tsx scripts/test-diagram-pipeline.ts <audit_id?>
```

Le script affiche pour chaque diagramme le solution_id, le statut, et
le storage_path résultant. Les fichiers sont visibles dans Supabase
Storage → bucket `audit-diagrams`.

**Test du DOCX avec diagrammes inclus** :

```bash
npx tsx scripts/test-docx-build.ts <audit_id?>
```

Produit `tmp/audit-<slug>-<id>.docx` avec les diagrammes intégrés
(centrés, légendés en italique muted) après chaque opportunité dans
les sections phase 1 et phase 2 de la feuille de route. Les solutions
sans diagramme affichent « *Diagramme non disponible pour cette
solution.* ».

**Variables d'environnement** : `GEMINI_API_KEY` (Google AI Studio).
Voir `.env.example`.

**Style guide** : `docs/references/style-guide-v1.png` (planche v3,
jointe à chaque appel Gemini comme référence visuelle). Si tu la
regénères, garde le même chemin et les mêmes dimensions pour ne pas
casser les chemins relatifs résolus dans `src/lib/diagrams/diagram-pipeline.ts`.

## Migrations SQL

Les migrations versionnées vivent dans `sql/migrations/`. À exécuter dans
Supabase SQL Editor par ordre chronologique.

**Session 2A** :
- `2026-04-23_add_resume_email_sent_at.sql` — colonne `audits.resume_email_sent_at`.

**Session 2B** :
- `2026-04-23_audits_pipeline_status.sql` — colonne `audits.pipeline_completed_at`
  + statuts `pending_review` et `error` (documentés, pas de check constraint).
- `2026-04-23_patterns_embedding_voyage3.sql` — redimensionne
  `patterns.embedding` à `VECTOR(1024)` pour Voyage-3, recrée l'index ivfflat,
  et crée la RPC `match_patterns_voyage3`. **Après l'avoir appliquée, relancer
  `npm run embeddings:generate`** (les anciens embeddings 1536 dims sont
  supprimés par la migration).
- `2026-04-23_audits_status_check.sql` — CHECK constraint strict sur
  `audits.status` (valeurs autorisées : `draft`, `running`, `pending_review`,
  `approved`, `delivered`, `error`). Nettoyer les rows avec des statuts legacy
  avant d'appliquer.
- `2026-04-23_audit_logs_tokens.sql` — colonnes `model_used`, `input_tokens`,
  `output_tokens` + index composite pour l'endpoint `/api/admin/costs`.

**Session 2C** :
- `2026-04-25_admin_review_fields.sql` — étend le CHECK statut pour inclure
  `changes_requested` et `rejected`, ajoute 7 colonnes admin sur `audits`
  (`admin_notes_global`, `reviewed_at`, `reviewed_by`, `approved_at`,
  `delivered_at`, `public_report_token`, `public_report_token_expires_at`),
  crée la table `audit_review_events` avec son index et une policy
  service-role-only.

**Session 2D** :
- `2026-04-25_docx_storage.sql` — crée le bucket Supabase Storage privé
  `audit-reports` avec 4 policies RLS service-role-only, ajoute
  `docx_storage_path` et `docx_generated_at` sur `audits`.

**Session 2E** :
- `2026-04-26_diagrams_storage.sql` — crée le bucket Supabase Storage
  privé `audit-diagrams` avec 4 policies RLS service-role-only, ajoute
  `diagrams_metadata` (jsonb) sur `audits`, met à jour le commentaire
  de `audit_review_events` pour documenter les nouveaux event_type
  (`diagrams_generation_started`, `diagram_generated`,
  `diagram_regenerated`, `diagram_failed`).

## Cron : relance des formulaires abandonnés

Un cron Vercel (`vercel.json`) tape `/api/cron/send-resume-emails` toutes
les 15 minutes. Il cible les `audits` avec `status='draft'`, inactivité
> 30 min, email présent, et `resume_email_sent_at IS NULL` — exactement
une relance par draft.

### Tester le cron en local

```bash
# 1. Démarrer le serveur local (front + serverless)
npx vercel dev

# 2. Dans un autre terminal, déclencher le cron manuellement
#    (CRON_SECRET doit être défini dans .env)
curl -s http://localhost:3000/api/cron/send-resume-emails \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

Réponse attendue : `{ success: true, summary: { examined, sent, dev, skipped, failed }, results: [...] }`.

Sans `Authorization` valide, l'endpoint retourne `401 Unauthorized`.

En mode dev (sans `RESEND_API_KEY`), les courriels ne sont pas envoyés
mais `resume_email_sent_at` est quand même mis à jour — regarde la console
pour voir le `resumeUrl` de chaque draft.

## Pipeline d'audit (Session 2B)

Le pipeline complet enchaîne 5 skills Claude (Opus 4.7) + matching
sémantique pgvector, et stream la progression au client via SSE.

Architecture :
- `api/skills/skill-{1..5}-*.ts` — 1 endpoint par skill (appelable en isolation)
- `api/audit/run.ts` — orchestrateur SSE qui appelle les skills via le
  helper `runSkill()` (pas d'aller-retour HTTP entre fonctions)
- `api/audit/send-completion-emails.ts` — déclenché en fire-and-forget
  après `pipeline_completed` (client + admin) ou `pipeline_error`
- Front : `/audit/progress/:auditId` consomme le stream SSE via
  `useAuditProgress()` et affiche 4 étapes visuelles

**Runtime** : Node serverless avec `maxDuration: 300` (Vercel Pro requis —
durée observée 3-8 min). Un heartbeat SSE toutes les 15 s garde le client
vivant.

### Prérequis avant le premier run

1. **Appliquer les migrations** Session 2B (voir section précédente).
2. **Générer les embeddings des patterns** :
   ```bash
   npm run embeddings:generate
   ```
   Vérifier ensuite dans Supabase SQL Editor :
   ```sql
   SELECT id, embedding IS NOT NULL AS has_embedding FROM patterns;
   ```
3. Configurer `ADMIN_EMAIL` dans `.env` pour recevoir les notifications de
   révision.

### Tester le pipeline en local

```bash
# 1. Remplir un intake jusqu'à l'écran 7 (ou créer un audit draft directement)
# 2. Déclencher le pipeline manuellement et regarder le flux SSE :
curl -N -X POST http://localhost:3000/api/audit/run \
  -H "Content-Type: application/json" \
  -d '{"auditId":"<UUID_DU_DRAFT>"}'
```

Événements attendus dans l'ordre :
`pipeline_started` → `skill_1_started/completed` → `matching_started/completed`
→ `skill_2_started/completed` → `skills_3_4_started` →
`skill_3_completed` + `skill_4_completed` → `skills_3_4_completed` →
`skill_5_started/completed` → `pipeline_completed`.

Après succès, vérifier dans Supabase que `audits.status = 'pending_review'`,
que les 5 `skill_N_output` sont remplis et que `pipeline_completed_at` est
horodaté. Les 2 courriels partent en fire-and-forget (loggés si
`RESEND_API_KEY` absent).

### Tester un skill en isolation

```bash
curl -X POST http://localhost:3000/api/skills/skill-1-context-builder \
  -H "Content-Type: application/json" \
  -d '{"intakeData": { "first_name":"Marie", "business_name":"Test", ... }}'
```

Retour : `{ output, tokensUsed, durationMs, model, attempts }`.

### Coût par audit

Pipeline Opus 4.7 partout : ~2,25 $ CAD/audit. Chaque skill persiste une
row `audit_logs` avec `event_type='skill_completed'`, `model_used`,
`input_tokens`, `output_tokens`, `tokens_used`, `duration_ms` et `cost_usd`
(calculé via `src/lib/ai/pricing.ts` en USD).

Pour consulter les coûts agrégés sur les 30 derniers jours :

```bash
curl -s "http://localhost:3000/api/admin/costs?days=30" \
  -H "Authorization: Bearer $ADMIN_API_SECRET" | jq
```

Retourne : `summary` (audits, tokens totaux, coût total, coût moyen/audit),
`by_skill` (1 ligne par skill avec runs, tokens, coût, durée moyenne),
`by_audit` (top 50 par coût décroissant).

Quand Anthropic révise ses prix ou qu'un modèle est ajouté, mettre à jour
`MODEL_PRICING_USD` dans `src/lib/ai/pricing.ts`.

---



Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
