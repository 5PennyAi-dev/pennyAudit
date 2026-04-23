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

Pipeline Opus 4.7 partout : ~2,25 $ CAD/audit. Les `tokensUsed` sont loggés
par `sendEvent` côté backend — à intégrer à une table `audit_logs` plus tard.

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
