# Instructions Claude Code — Session 2C : Interface admin de révision

> **Objectif** : Construire l'interface admin qui permet à Christian de réviser
> humainement chaque audit (5 outputs JSON denses) avant de l'approuver et de
> l'envoyer au client.
>
> **Durée estimée** : 3-4 heures réparties sur 2-3 sessions Claude Code.
>
> **Livrables** : Liste des audits + page détail multi-onglets + édition des
> `reviewer_notes` + actions admin (approuver / demander modifs / rejeter) +
> bouton « Approuver et envoyer » qui génère une page rapport HTML publique
> et envoie un courriel au client.

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. Faire un commit de référence : `git commit -am "session-2c: start"`
3. Donner ce document à Claude Code en contexte initial
4. Procéder **étape par étape**, commit après chaque étape avec un message clair
5. Ne pas sauter d'étapes. Si une étape échoue, corriger avant de passer à la suivante
6. Si une décision semble ambiguë, indiquer les options à Christian au lieu de
   deviner — il ajustera au retour de session

---

## Décisions structurantes (déjà tranchées, ne pas re-débattre)

- **Authentification admin** : mot de passe simple (`ADMIN_PASSWORD` en env)
  + cookie de session signé. Pas de magic link, pas de Supabase Auth, pas de
  gestion multi-utilisateurs. Christian est le seul admin.
- **Bouton « Approuver et envoyer »** : envoie au client un courriel avec un
  lien vers une **page web HTML stylée** affichant le rapport. La génération
  DOCX est explicitement reportée à la **Session 2D**.
- **Page rapport publique** : accessible via un token signé (JWT, expire 90
  jours), pas derrière l'auth admin.
- **Pas de bilinguisme** : tout l'admin et le rapport public sont en français.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Sessions 2A et 2B livrées et fonctionnelles (`npm run dev` lance le tout)
- [ ] Supabase contient au moins un audit avec `status = 'pending_review'` et
      les 5 outputs (`context_output`, `opportunities_output`, `risks_output`,
      `stack_output`, `report_output`) populés. Si pas de cas réel, créer un
      seed de test avec les outputs de l'audit Sophie Tremblay (cf. historique).
- [ ] Le scaffold `/admin` n'existe pas encore — on crée tout à partir de zéro
- [ ] `DESIGN_SYSTEM.md` est à jour dans le repo
- [ ] `skills-prompts-v2.yaml` est à jour dans `docs/specs/` (la 2B-bis a
      enrichi les outputs, l'admin doit refléter cette structure)
- [ ] Vérifier si un endpoint pour relancer le pipeline existe déjà
      (`/api/audit/[id]/rerun` ou équivalent). Si oui : noter son chemin pour
      l'Étape 8. Si non : il sera créé pendant l'Étape 8.

---

## Contexte à charger

Avant de commencer, Claude Code lit dans l'ordre :

1. `docs/CONTEXT_PROJET.md` — vision globale
2. `docs/DESIGN_SYSTEM.md` — tokens visuels, composants
3. `docs/specs/skills-prompts-v2.yaml` — **schémas exacts des 5 outputs** que
   l'admin doit afficher (sections `output_schema` de chaque skill)
4. Le schéma Supabase actuel de la table `audits` (les colonnes `*_output`
   et le champ `status`)

---

## Étape 1 — Schéma DB et champs admin

**Objectif** : S'assurer que la table `audits` peut accueillir les artefacts
de la révision admin, et créer une table d'historique des décisions.

**Migrations Supabase à créer** :

- `supabase/migrations/202604XX_admin_review_fields.sql`

**Colonnes à ajouter à `audits`** (si elles n'existent pas déjà) :

```sql
ALTER TABLE audits ADD COLUMN IF NOT EXISTS admin_notes_global text;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS reviewed_by text;  -- email de l'admin
ALTER TABLE audits ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS public_report_token text;  -- JWT
ALTER TABLE audits ADD COLUMN IF NOT EXISTS public_report_token_expires_at timestamptz;
```

**Nouvelle table `audit_review_events`** pour l'historique :

```sql
CREATE TABLE audit_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  event_type text NOT NULL,  -- 'opened', 'note_saved', 'approved', 'rejected', 'changes_requested', 'sent_to_client'
  payload jsonb,             -- contenu libre selon event_type (ex. raison du rejet)
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_review_events_audit_id ON audit_review_events(audit_id, created_at DESC);
```

**Statuts à formaliser dans une fonction de validation** (pas un enum DB pour
garder la souplesse) :

```
draft → running → pending_review → (approved | changes_requested | rejected) → delivered
                                                       ↑
                                                       │ après corrections
                                                       └── retour à pending_review
```

**Critère de réussite** : Migration appliquée localement (Supabase CLI ou
pgAdmin), schéma vérifiable par `\d audits` et `\d audit_review_events`.

---

## Étape 2 — Authentification admin

**Objectif** : Protéger toute la section `/admin/*` derrière un mot de passe
unique côté serveur.

**Fichiers à créer** :

- `api/admin/auth/login.ts` — endpoint POST qui valide le mot de passe et
  pose un cookie signé
- `api/admin/auth/logout.ts` — endpoint POST qui efface le cookie
- `src/lib/admin-auth.ts` — helper côté serveur qui vérifie le cookie sur
  toute route `/api/admin/*` (pas `/auth/*`)
- `src/pages/admin/Login.tsx` — page de saisie du mot de passe
- `src/components/admin/RequireAdmin.tsx` — wrapper côté client qui redirige
  vers `/admin/login` si pas authentifié

**Variables d'environnement à ajouter à `.env.example`** :

```
ADMIN_PASSWORD=<mot de passe long, défini par Christian, jamais commit>
ADMIN_SESSION_SECRET=<secret pour signer le cookie, 32+ caractères>
ADMIN_SESSION_DURATION_HOURS=12  # default
```

**Logique du cookie** :

- Nom : `admin_session`
- Contenu : JWT signé `{ adminEmail: ADMIN_EMAIL, exp: ... }`
- Flags : `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`
- Le helper `requireAdmin(req)` lit le cookie, valide la signature et l'exp,
  retourne soit `{ ok: true, email }` soit `{ ok: false, reason }`

**Logique de la page Login** :

- Champ password unique (pas d'email — il n'y a qu'un admin)
- POST vers `/api/admin/auth/login` avec `{ password }`
- En cas de succès → redirige vers `/admin/audits`
- En cas d'échec → message d'erreur générique (« Mot de passe incorrect »),
  pas de timing attack possible (comparaison constant-time côté serveur)
- Rate limiting léger : 5 tentatives par IP par 15 minutes (in-memory pour
  le MVP, Redis plus tard si nécessaire)

**Critère de réussite** :

- Aller sur `/admin/audits` redirige vers `/admin/login`
- Saisir le bon mot de passe → arrivée sur `/admin/audits`
- Le cookie persiste après refresh
- Cliquer « Déconnexion » dans le header → retour à `/admin/login`

---

## Étape 3 — Layout admin et navigation

**Objectif** : Le shell visuel commun à toutes les pages admin.

**Fichiers à créer** :

- `src/layouts/AdminLayout.tsx` — wrapper avec sidebar + header + slot
- `src/components/admin/AdminHeader.tsx` — barre du haut (titre de page +
  bouton déconnexion + indicateur env)
- `src/components/admin/AdminSidebar.tsx` — navigation latérale

**Spécifications visuelles** (respecter `DESIGN_SYSTEM.md`) :

- Sidebar fond Navy 600 (`#0F2744`), texte blanc, accent Orange 500 sur
  l'item actif
- Header fond Paper, bordure inférieure `--color-line`
- Largeur sidebar : 240px desktop, drawer collapsable mobile
- Sections sidebar :
  - **Audits** (lien `/admin/audits`)
  - Plus tard : *Coûts*, *Patterns*, *Paramètres* (placeholders disabled
    pour la 2C)

**Indicateur d'environnement** : badge dans le header qui affiche `LOCAL`,
`PREVIEW` ou `PROD` selon `VITE_ENV` ou équivalent. Rouge en `PROD`, neutre
sinon. Évite de faire des manipulations en prod par mégarde.

**Critère de réussite** : Le layout est cohérent avec le reste de l'app,
responsive, et utilise uniquement les tokens Tailwind du design system
(aucune couleur hardcodée).

---

## Étape 4 — Page liste des audits (`/admin/audits`)

**Objectif** : Vue tabulaire de tous les audits avec filtres et tri.

**Fichiers à créer** :

- `src/pages/admin/AuditsList.tsx` — la page
- `api/admin/audits/list.ts` — endpoint GET qui retourne les audits
- `src/components/admin/AuditStatusBadge.tsx` — pastille colorée par statut
- `src/components/admin/AuditDeadline.tsx` — affichage SLA

**Colonnes du tableau** :

| Colonne | Contenu | Tri |
|---|---|---|
| Statut | Pastille colorée (`pending_review` orange, `approved` vert, `delivered` gris, `running` bleu pulsé, `error` rouge, `changes_requested` ambre, `rejected` rouge foncé) | oui |
| Client | `prénom + courriel` extrait de `intake_data` | oui |
| Secteur | `industry` extrait de `intake_data` | oui |
| Soumis le | `created_at` formaté `25 avr. 2026, 14h32` | oui (défaut DESC) |
| SLA | « Reste 12h » / « Dépassé de 2h » selon `created_at` + 48h, rouge si dépassé | oui |
| Action | Lien « Réviser » vers `/admin/audits/[id]` | non |

**Filtres en haut du tableau** :

- Statut (multi-select, défaut : `pending_review` coché seul)
- Recherche par courriel ou prénom client (debounced 300ms)
- Bouton « Tout afficher » qui reset les filtres

**Pagination** : 25 par page, simple « Précédent / Suivant », pas de page
numérotée (overkill pour le volume actuel).

**Endpoint `GET /api/admin/audits/list`** :

- Query params : `status[]`, `q`, `page`, `sort_by`, `sort_dir`
- Retourne `{ audits: [...], total: number, page: number, page_size: 25 }`
- Auth via `requireAdmin` middleware
- Service Role Key Supabase (RLS bypass)

**Critère de réussite** :

- Le tableau s'affiche en moins de 500ms en local
- Filtres et tri fonctionnent et persistent dans l'URL (querystring)
- L'audit Sophie ou Marc apparaît s'il est en DB

---

## Étape 5 — Page détail (`/admin/audits/[id]`) — structure et onglets

**Objectif** : La coquille de la page de révision, avec navigation par
onglets entre les 5 sections. Pas encore le rendu détaillé de chaque section
(c'est l'Étape 6).

**Fichiers à créer** :

- `src/pages/admin/AuditDetail.tsx` — page principale
- `api/admin/audits/[id]/get.ts` — endpoint GET de l'audit complet
- `src/components/admin/AuditDetailHeader.tsx` — bandeau du haut (client,
  statut, dates clés, actions)
- `src/components/admin/AuditTabs.tsx` — barre d'onglets

**Bandeau du haut** :

- Prénom + courriel client en gros (Navy 600)
- Sous-titre : `Audit lancé le 25 avr. 2026 · Statut : pending_review`
- À droite : bouton « ← Retour à la liste »
- Sous le bandeau : actions principales (boutons disabled pour l'instant,
  câblés à l'Étape 8)

**Onglets** :

1. **Intake** — affichage brut des 19 réponses du formulaire
2. **Contexte** — output du Skill 1
3. **Opportunités** — output du Skill 2
4. **Risques** — output du Skill 3
5. **Stack** — output du Skill 4
6. **Rapport final** — output du Skill 5
7. **Notes & historique** — `admin_notes_global` + timeline des
   `audit_review_events`

L'onglet actif est mémorisé dans le querystring (`?tab=opportunities`) pour
que recharger la page revienne au même endroit.

**Endpoint `GET /api/admin/audits/[id]/get`** :

- Retourne `{ audit: {...}, review_events: [...] }`
- 404 si audit introuvable, 403 si pas admin
- Émet un événement `opened` dans `audit_review_events` à chaque appel
  (utile pour debug, on fera le filtrage plus tard si trop bruyant)

**Critère de réussite** :

- Naviguer vers `/admin/audits/<vrai-id>` charge la page
- Les 7 onglets s'affichent et changent l'URL
- Chaque onglet montre pour l'instant un placeholder « Section X — à venir
  Étape 6 » et le JSON brut en `<pre>` (debug temporaire)

---

## Étape 6 — Composants de rendu humain par section

**Objectif** : Transformer les outputs JSON denses en lecture humaine
agréable. C'est l'étape avec le plus de travail UI ; prendre le temps.

**Fichiers à créer** dans `src/components/admin/sections/` :

- `IntakeView.tsx` — rendu lisible des 19 réponses (groupées par bloc)
- `ContextView.tsx` — rendu de `context_output`
- `OpportunitiesView.tsx` — rendu de `opportunities_output`
- `RisksView.tsx` — rendu de `risks_output`
- `StackView.tsx` — rendu de `stack_output`
- `ReportView.tsx` — rendu de `report_output` (le plus complexe)
- `ReviewEventsTimeline.tsx` — rendu de l'historique

**Conventions communes** :

- Utiliser des `<section>` titrées avec `H2` Navy 600
- Les longs paragraphes (`narrative`, `executive_summary.opening_paragraph`)
  rendus en prose, pas en JSON
- Les arrays d'objets rendus en cartes ou en lignes selon la densité
- Les scores (`impact_score`, `effort_score`) en bulles colorées
- Les `confidence_level` affichés en badge (low = ambre, medium = bleu,
  high = vert) avec tooltip d'explication
- Les `source_pattern_ids` cliquables (pour la 2C : juste un lien vers
  Github du repo patterns ; un détail pattern viendra plus tard)

**Détails par section** :

### IntakeView
Liste les 19 questions dans l'ordre du YAML `intake-form-v1.yaml`, avec la
question en label gris muted et la réponse en navy. Champs vides affichés
en italique muted (« Non renseigné »).

### ContextView
Sections : Profil entreprise (narrative en prose), Contexte opérationnel,
Résumé des défis, Évaluation de maturité, **Portrait sectoriel**
(highlight visuel avec callout cream + bordure orange — c'est le morceau
2B-bis le plus visible), **Chiffres extraits du client** (tableau).

### OpportunitiesView
Pour chaque opportunité : titre, narrative, score impact/effort, estimation
quantitative (highlight avec icône $), pattern source. Les opportunités
sont triées par score d'impact.

### RisksView
Sections : Risques généraux (liste), Risques sectoriels (liste — c'est
celui qui contient la mention Loi 25 pour les secteurs santé/finance),
Mitigations recommandées.

### StackView
Tableau : Outil mentionné par le client | Évaluation | Recommandation.
Section additionnelle « Outils suggérés » avec leurs prix.

### ReportView
Le plus dense. Sections dans l'ordre du schéma :

- Sommaire exécutif (paragraphe d'ouverture, top 3 recommandations,
  outcome 12 mois)
- Matrice impact/effort (idéalement un petit graphique 2D, sinon tableau
  groupé par quadrant)
- Roadmap (3 phases avec timeframes, opportunités, jalons)
- Estimations ROI (tableau)
- **Synthèse consolidée des gains** (la section sensible —
  highlight cream avec callout)
- **Livrables actionnables** (15 prompts, politique Loi 25, KPI dashboard)
  — chaque livrable dans une carte expansible
- Voie recommandée (radio-style A / B / C avec justification)
- Notes de clôture

### ReviewEventsTimeline
Liste verticale chronologique inverse, chaque event avec icône + titre +
acteur + date + payload formaté (raison du rejet, contenu de note, etc.).

**Critère de réussite** :

- Les 6 onglets affichent le contenu de manière lisible
- Aucune duplication d'info entre les sections
- Aucun JSON brut visible (sauf debug temporaire à retirer)
- Test sur l'audit Sophie ET l'audit Marc — les deux rendus doivent être
  cohérents malgré les contenus très différents

---

## Étape 7 — Édition des `reviewer_notes` et de la note globale

**Objectif** : Christian peut annoter chaque section pendant qu'il lit.

**Fichiers à créer** :

- `src/components/admin/InlineNoteEditor.tsx` — textarea inline avec
  auto-save
- `api/admin/audits/[id]/notes/save.ts` — endpoint POST
- Hook `useAutoSave` réutilisable dans `src/hooks/useAutoSave.ts` (debounce
  1500ms, indicateur « Sauvegarde… » → « Sauvegardé »)

**Emplacement des `InlineNoteEditor`** :

- En **bas de chaque onglet de section** (1 textarea par section) — édite
  `<section>_output.reviewer_notes` (le champ est dans le JSON du output)
- Dans l'onglet **Notes & historique** — édite `admin_notes_global`
  (colonne directe sur `audits`)

**Logique de sauvegarde** :

- Endpoint `POST /api/admin/audits/[id]/notes/save`
- Body : `{ section: 'context'|'opportunities'|...|'global', content: string }`
- Pour les sections : update du JSON `<section>_output.reviewer_notes`
  (jsonb_set en PostgreSQL)
- Pour `global` : update direct de la colonne `admin_notes_global`
- Émet un event `note_saved` dans `audit_review_events` avec `{ section,
  length }` dans le payload (pas le contenu — historique propre, pas un
  log à fuiter)

**UI de l'éditeur** :

- Label « Notes de révision » au-dessus
- Textarea auto-resize (min 3 lignes, max 12)
- Indicateur d'état à droite : `· Sauvegardé il y a 4s` / `· Sauvegarde…`
- Pas de bouton submit explicite — l'auto-save suffit

**Critère de réussite** :

- Taper dans une note, attendre 1.5s, l'indicateur passe à « Sauvegardé »
- Recharger la page, la note est toujours là
- Vérifier en DB que le JSON imbriqué est correctement mis à jour

---

## Étape 8 — Actions admin et workflow de décision

**Objectif** : Les boutons en haut de la page détail qui changent le
statut de l'audit.

**Fichiers à créer** :

- `src/components/admin/AuditActions.tsx` — la barre de boutons
- `src/components/admin/RequestChangesModal.tsx` — modal pour demander
  modifs (champ raison)
- `src/components/admin/RejectModal.tsx` — modal pour rejeter (champ
  raison + checkbox de confirmation)
- `api/admin/audits/[id]/request-changes.ts` — POST
- `api/admin/audits/[id]/reject.ts` — POST

**Boutons selon le statut courant** :

- Si `pending_review` :
  - **Approuver et envoyer** (Orange 500, principal — câblé Étape 9)
  - **Demander des modifications** (outline navy)
  - **Rejeter** (outline danger)

- Si `changes_requested` :
  - **Relancer le pipeline** — déclenche un POST vers
    `/api/audit/[id]/rerun` qui ré-exécute les skills 1-5 sur le même
    `intake_data` et fait passer le statut à `running` puis
    `pending_review` à la fin.

  **Si cet endpoint n'existe pas déjà**, le créer dans cette étape :
  - Réutiliser le code orchestrateur de `/api/audit/run` créé en
    Session 2B (le SSE n'est pas nécessaire ici — pas de UI de progression,
    juste un déclenchement asynchrone)
  - Avant l'exécution, mettre `status = 'running'` et **conserver les
    outputs précédents** (ne pas les écraser tant que les nouveaux ne sont
    pas validés — au cas où le rerun échoue, on garde une version)
  - À la fin, écraser les `*_output` avec les nouveaux et statut
    `pending_review`
  - Émettre un event `pipeline_rerun` dans `audit_review_events` au
    déclenchement

- Si `approved` :
  - Boutons grisés, badge « Approuvé le X par Y » à droite

- Si `delivered` :
  - Boutons grisés, badge « Envoyé au client le X » + bouton secondaire
    « Voir le rapport public » (ouvre l'URL signée dans nouvel onglet)

**Logique « Demander des modifications »** :

- Modal avec textarea obligatoire (« Que faut-il modifier ? »)
- Confirmer → POST `/api/admin/audits/[id]/request-changes` avec
  `{ reason }`
- Backend : statut → `changes_requested`, event `changes_requested` dans
  l'historique avec `payload.reason`
- Pas de courriel automatique au client à ce stade (Christian relance
  manuellement le pipeline ; le client n'a pas vue sur ce statut)

**Logique « Rejeter »** :

- Modal avec textarea obligatoire + checkbox « Je confirme que cet audit
  ne sera pas livré au client »
- Confirmer → POST `/api/admin/audits/[id]/reject` avec `{ reason }`
- Backend : statut → `rejected`, event `rejected`
- Pas de courriel client automatique (cas suffisamment rare et délicat
  pour être géré à la main par Christian)

**Critère de réussite** :

- Cliquer « Demander des modifications » → modal → confirmer → statut
  passe à `changes_requested` et l'event apparaît dans l'historique
- Cliquer « Rejeter » → modal → confirmer → statut `rejected`, event
  enregistré
- Les boutons sont correctement disabled/visibles selon le statut

---

## Étape 9 — Bouton « Approuver et envoyer » (le morceau central)

**Objectif** : Pipeline complet de l'approbation au courriel client.

**Fichiers à créer** :

- `api/admin/audits/[id]/approve-and-send.ts` — endpoint POST
- `src/lib/report-token.ts` — génération/validation du JWT pour le
  rapport public
- `src/lib/email/audit-delivery-template.ts` — template du courriel client
- `src/pages/public/PublicReport.tsx` — page rapport publique
- `api/public/report/[token].ts` — endpoint qui valide le token et retourne
  l'audit en lecture seule

**Logique du endpoint `approve-and-send`** :

1. Valider que l'audit est en `pending_review`
2. Générer un JWT signé `{ auditId, exp: now + 90 days }` avec
   `RESUME_TOKEN_SECRET` (ou un nouveau secret dédié, à toi de voir)
3. Stocker le token dans `audits.public_report_token` et l'expiration
4. Construire l'URL publique :
   `${PUBLIC_BASE_URL}/rapport/${token}`
5. Envoyer le courriel via Resend / Brevo (ou fallback dev — log dans la
   console si pas de clé API, comme la 2A et 2B)
6. Mettre à jour `status = 'delivered'`, `approved_at = now()`,
   `delivered_at = now()`, `reviewed_by = adminEmail`
7. Émettre l'event `approved` puis `sent_to_client` dans l'historique
8. Retourner `{ ok: true, public_url }`

**Template du courriel client** :

- Sujet : `Votre audit IA 5PennyAi est prêt`
- Corps en français, ton chaleureux mais professionnel, signature Christian
- Lien CTA grand format vers le rapport
- Mention que le lien est valide 90 jours
- Note discrète : « Si vous avez des questions, répondez à ce courriel »
- Pas de pièces jointes (la 2D ajoutera le DOCX)

**Page rapport publique `/rapport/:token`** :

- **Pas derrière l'auth admin** — accès public via token
- Layout différent de l'admin : pleine largeur, sans sidebar, branding
  5PennyAi en header, fond cream, lecture confortable type article long
- Affiche **uniquement le `report_output`** du Skill 5 (pas les sections
  intermédiaires Contexte/Opportunités/Risques/Stack — c'est de la cuisine
  interne)
- Réutilise `ReportView.tsx` créé à l'Étape 6 mais avec un wrapper visuel
  différent (lecture publique vs lecture admin)
- Si token invalide ou expiré : page d'erreur sobre avec « Ce lien n'est
  plus valide. Contactez-nous à hello@5pennyai.com pour récupérer votre
  rapport. »
- Bouton discret en bas « Imprimer cette page » qui déclenche
  `window.print()` — `@media print` propre dans le CSS pour qu'on puisse
  faire un PDF du navigateur en attendant la 2D

**Sécurité du token** :

- JWT court (HS256 suffit), audience `public_report`
- Pas de PII dans le payload (juste `auditId` et `exp`)
- Validation côté serveur : signature OK, non expiré, audit existe et a
  bien le même token stocké en DB (au cas où on a besoin de révoquer en
  invalidant en DB)

**Critère de réussite (test bout-en-bout)** :

1. Ouvrir un audit en `pending_review`
2. Cliquer « Approuver et envoyer »
3. Confirmer dans la modal de confirmation (étape de garde-fou)
4. Le statut passe à `delivered`, le bandeau affiche « Envoyé au client
   le X »
5. Le courriel s'affiche dans la console (mode dev) avec un lien
   `/rapport/<token>`
6. Cliquer le lien dans la console → la page publique s'affiche
   correctement sans demander d'auth
7. Refresh : la page reste accessible
8. Modifier manuellement le token en DB → le lien renvoie l'erreur

---

## Étape 10 — Test bout-en-bout et polissage

**Objectif** : S'assurer que le flux complet tient la route.

**Scénario de test (à exécuter manuellement)** :

1. Soumettre un nouveau formulaire d'intake (depuis l'écran 7)
2. Le pipeline se déroule, l'audit passe en `pending_review`
3. Aller sur `/admin/audits` (en admin) → l'audit apparaît en haut, badge
   orange `pending_review`, SLA 48h affiché
4. Cliquer « Réviser »
5. Naviguer dans les 7 onglets, vérifier que les rendus sont cohérents
6. Ajouter une note de révision dans l'onglet Opportunités, attendre
   l'auto-save, refresh → la note est toujours là
7. Ajouter une note globale dans l'onglet Notes
8. Cliquer « Demander des modifications » avec une raison → statut →
   `changes_requested`
9. Cliquer « Relancer le pipeline » → statut → `running` → après quelques
   minutes → `pending_review`
10. Cliquer « Approuver et envoyer »
11. Vérifier le courriel en console, ouvrir le lien, voir le rapport
    public
12. Imprimer en PDF depuis le navigateur, vérifier que c'est lisible

**Polissage** :

- Toutes les couleurs proviennent du design system (grep `style=` ne
  doit rien retourner de hardcodé)
- Les états de chargement sont gérés (skeletons sur les listes, spinners
  sur les actions, désactivation des boutons pendant les requêtes)
- Les erreurs 4xx/5xx affichent un toast lisible (« Une erreur est
  survenue, recharge la page »)
- L'admin marche sur mobile (Christian peut réviser depuis son téléphone
  dans le bus si besoin) — sidebar en drawer collapsable, onglets
  scrollables horizontalement

**Critère de réussite** : Christian peut réviser un audit complet sans
ouvrir Supabase SQL Editor une seule fois.

---

## Livrables finaux de la Session 2C

Après cette session, le repo doit contenir :

- [x] Migration SQL `admin_review_fields` appliquée
- [x] Table `audit_review_events` avec son index
- [x] Auth admin par mot de passe + cookie signé
- [x] Layout admin (header, sidebar, indicateur env)
- [x] Page `/admin/audits` avec filtres, tri, pagination
- [x] Page `/admin/audits/:id` avec 7 onglets
- [x] 7 composants de rendu (Intake, Contexte, Opportunités, Risques,
      Stack, Rapport, Timeline)
- [x] Édition inline des `reviewer_notes` par section + note globale
- [x] Actions admin : approuver, demander modifs, rejeter, relancer
- [x] Endpoint `approve-and-send` avec génération du token et envoi
      courriel
- [x] Page rapport publique `/rapport/:token` (sans auth, accès via JWT)
- [x] Variables d'environnement documentées dans `.env.example`
- [x] `README.md` mis à jour avec instructions « Comment réviser un audit »
- [x] `PROJECT_STATE.md` mis à jour avec ✅ Session 2C

---

## Ce qui n'est PAS dans la 2C

Pour éviter toute confusion, ces éléments seront traités plus tard :

- **Génération DOCX** : reportée à la Session 2D. La page rapport HTML +
  impression navigateur suffit pour les beta-tests.
- **Vue détail d'un pattern** depuis les liens `source_pattern_ids` :
  les liens pointeront vers le repo Github des patterns en attendant.
- **Multi-utilisateurs admin** : un seul mot de passe, un seul admin.
- **Notifications push / SMS quand un audit arrive en `pending_review`** :
  pas pour l'instant. Christian regarde la liste manuellement.
- **Gestion des coûts par audit** : l'endpoint `/api/admin/costs` existe
  déjà depuis la 2A/2B, on ne le touche pas.

---

## Notes et rappels

- **Service Role Key** : tous les endpoints admin utilisent la Service
  Role Key Supabase pour bypass RLS. Ne jamais l'exposer côté client.
- **Tokens visuels** : aucune couleur hardcodée. Tout passe par les
  classes Tailwind du design system.
- **Bilinguisme** : tout est en français. Pas de i18next.
- **Accessibilité** : labels associés aux inputs, focus visible, navigation
  clavier dans les onglets et la modal de rejet.
- **Commit après chaque étape** avec un message clair :
  `session-2c: step N - description`
- **Rollback facile** : si une étape casse quelque chose,
  `git reset --hard HEAD~1` et reprendre.

---

## Si quelque chose tourne mal

- Si une décision semble ambiguë, indiquer les options à Christian au
  lieu de deviner.
- Si Supabase rejette un write, vérifier les RLS policies et la Service
  Role Key.
- Si l'envoi de courriel échoue, vérifier le fallback dev et les variables
  `RESEND_API_KEY` / `EMAIL_FROM` / `PUBLIC_BASE_URL`.
- Si la migration SQL échoue, vérifier que les colonnes n'existent pas déjà
  (les `IF NOT EXISTS` aident).
- Si le pipeline existant rerun depuis `changes_requested` produit des
  outputs différents, c'est attendu (les skills sont non-déterministes).
  C'est précisément pour ça que la révision humaine existe.

---

*Document produit le 25 avril 2026 pour la Session Claude Code 2C.*
*À lire en conjonction avec `DESIGN_SYSTEM.md`, `skills-prompts-v2.yaml` et*
*`CONTEXT_PROJET.md`.*
