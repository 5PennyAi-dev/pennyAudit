# Instructions Claude Code — Session 2D : Export DOCX automatisé

> **Objectif** : Générer automatiquement un fichier `.docx` à partir des
> outputs des skills, le stocker dans Supabase Storage, le joindre au
> courriel client lors de l'approbation, et permettre à Christian de le
> télécharger depuis l'admin pour vérification ou re-livraison.
>
> **Durée estimée** : 2-3 heures sur 1-2 sessions Claude Code.
>
> **Livrables** : Module générateur DOCX, endpoint de génération,
> intégration dans le flux `approve-and-send`, bouton de téléchargement
> admin, et trois micro-chantiers de polissage UI couplés (mapping
> secteurs, nom de famille client, affirmation de révision conditionnelle).

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. `git commit -am "session-2d: start"` pour avoir un point de rollback
3. Donner ce document à Claude Code en contexte initial
4. Procéder **étape par étape**, commit après chaque étape
5. Si une étape échoue, corriger avant de passer à la suivante
6. Si une décision semble ambiguë, demander à Christian au lieu de deviner

---

## Décisions structurantes (déjà tranchées)

- **Pas de PDF en 2D** : la conversion PDF (via LibreOffice headless ou
  service externe) est explicitement reportée. Le DOCX seul suffit pour
  les beta-tests. Les clients qui veulent un PDF peuvent ouvrir le DOCX
  dans Word et faire « Enregistrer en PDF » eux-mêmes, ou utiliser le
  bouton « Imprimer » de la page rapport publique (déjà en place
  depuis la 2C).
- **Bibliothèque** : `docx` (npm package, pure JS, fonctionne en
  serverless Vercel sans natif). C'est celle utilisée dans le script
  de référence `build-report.js`.
- **Stockage** : Supabase Storage, bucket privé `audit-reports`. URL
  signées temporaires (15 min) pour les téléchargements admin. Pour
  la pièce jointe courriel : on télécharge le buffer en mémoire au
  moment de l'envoi (pas d'URL publique persistante).
- **Scope** : la 2D ne touche **pas** au design ni au contenu du
  rapport. Elle reproduit fidèlement le rendu visuel du PDF Sophie
  (référence dans le projet) en format DOCX. Si quelque chose paraît
  faux dans le contenu, c'est une régression à corriger ; pas une
  invitation à innover.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Session 2C livrée et fonctionnelle. Page rapport publique
      `/rapport/:token` opérationnelle, flux `approve-and-send`
      câblé bout-en-bout.
- [ ] Au moins un audit en `pending_review` ou `delivered` avec ses
      5 outputs populés (Sophie ou Marc en DB).
- [ ] Le PDF de référence
      `Audit_IA___Clinique_dentaire_Sophie_Tremblay.pdf` est disponible
      (peut être déposé dans `docs/references/` du repo, ou consulté
      depuis l'historique de conversation).
- [ ] Bucket Supabase Storage `audit-reports` créé en mode **privé**.
      Si pas créé : le faire via le dashboard Supabase ou ajouter une
      migration `supabase/migrations/202604XX_storage_audit_reports.sql`.
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` déjà présente (utilisée par
      l'admin v2, c'est elle qui permet de signer les URLs Storage).

---

## Contexte à charger

Avant de commencer, Claude Code lit dans l'ordre :

1. `docs/PROJECT_STATE.md` — section « Documents Word de référence »
   et « Architecture admin (Session 2C) »
2. `docs/CONTEXT_PROJET.md` — pour le ton et la voix éditoriale
3. `docs/DESIGN_SYSTEM.md` — couleurs Navy/Orange/Cream à reproduire
   en DOCX (sections 1 et 2 du design system)
4. `docs/specs/skills-prompts-v2.yaml` — schémas exacts des outputs
   à transformer en DOCX (notamment la section `output_schema` du
   Skill 5 qui contient l'essentiel du rendu client)
5. **Le script de référence `build-report.js`** : à retrouver via
   `conversation_search` avec la requête « build-report.js docx
   sophie tremblay » dans les conversations Claude. Ce script a été
   produit manuellement le 25 avril 2026 et reproduit fidèlement le
   rendu visuel attendu. Il sert de **référence directe** pour ce
   qui est rendu, comment, et avec quels styles. Le code n'est pas
   parfait pour une intégration prod, mais la structure et les
   choix de design sont à conserver.
6. `Audit_IA___Clinique_dentaire_Sophie_Tremblay.pdf` (référence
   visuelle) — sert de benchmark : le DOCX 2D doit produire un rendu
   équivalent ou meilleur, jamais inférieur en densité ou en lisibilité.

---

## Étape 1 — Setup et fondations

**Objectif** : installer les dépendances et préparer le bucket Storage.

**Actions** :

- Installer la bibliothèque : `npm install docx`
  (vérifier que la version est compatible Vercel serverless — pas de
  binaires natifs)
- Créer le bucket Storage `audit-reports` s'il n'existe pas :
  - Mode **privé** (pas de public access)
  - Politique RLS : seul le Service Role Key peut lire/écrire
  - Migration SQL si tu préfères versionner :
    ```sql
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('audit-reports', 'audit-reports', false)
    ON CONFLICT (id) DO NOTHING;
    ```
- Ajouter une colonne sur `audits` pour tracer le fichier :
  ```sql
  ALTER TABLE audits ADD COLUMN IF NOT EXISTS docx_storage_path text;
  ALTER TABLE audits ADD COLUMN IF NOT EXISTS docx_generated_at timestamptz;
  ```
- Créer le squelette de module : `src/lib/report/docx-builder.ts`
  (vide pour l'instant, juste l'export d'une fonction
  `buildAuditDocx(audit) → Promise<Buffer>`)
- Créer le squelette de service Storage :
  `src/lib/storage/audit-reports.ts` avec deux fonctions :
  `uploadDocx(auditId, buffer) → Promise<string>` (retourne le path)
  et `getSignedUrl(auditId, expiresInSeconds=900) → Promise<string>`

**Critère de réussite** :

- `npm run build` passe sans erreur
- Le bucket `audit-reports` est visible dans Supabase Storage
- Les deux migrations sont appliquées

---

## Étape 2 — Module générateur DOCX (le cœur du travail)

**Objectif** : transformer un audit complet (les 5 outputs JSON) en
un fichier DOCX visuellement identique au PDF de référence Sophie.

**Fichier** : `src/lib/report/docx-builder.ts`

**Source de vérité** : le script `build-report.js` retrouvé via
`conversation_search`. Le porter en TypeScript, en :

- Remplaçant les valeurs hardcodées de Sophie par des accès dynamiques
  aux outputs de l'audit (`audit.report_output.executive_summary`, etc.)
- Conservant exactement la même palette : Navy 600 (`#0F2744`), Orange
  500 (`#F57D20`), Cream (`#FBF7F0`), Muted (`#5B6B7E`)
- Conservant la typographie Plus Jakarta Sans là où la bibliothèque
  `docx` le permet, sinon Calibri ou Aptos en fallback
- Gardant les mêmes éléments visuels : page de titre, callouts cream
  pour les sections sensibles (synthèse consolidée, mot de clôture),
  tableau impact/effort, tableau ROI, tableaux KPI

**Sections à générer dans cet ordre** (cf. PDF de référence) :

1. **Page de titre** — logo placeholder (texte « 5PENNYAI » en Orange
   500), titre « AUDIT PERSONNALISÉ », nom du client extrait de
   `intake_data.business_name` ou équivalent, date de livraison
2. **Sommaire exécutif** — `report_output.executive_summary`
3. **Résultat attendu à 12 mois** — `executive_summary.expected_outcome_12_months`
4. **Matrice impact/effort** — `report_output.impact_effort_matrix`
   organisée par quadrant (quick wins en haut à gauche, etc.)
5. **Feuille de route** — `report_output.roadmap` en 3 phases
6. **Estimations ROI** — `report_output.roi_estimates` une carte
   par opportunité avec temps gagné / impact revenus / payback
7. **Synthèse consolidée des gains** — `report_output.consolidated_impact_summary`
   dans un callout cream avec bordure orange
8. **Livrables actionnables** — `report_output.actionable_deliverables`
   chaque livrable développé (15 prompts, politique Loi 25, dashboard KPI)
9. **Voie recommandée** — `report_output.recommended_path`
10. **Mot de clôture** — `report_output.closing_notes`
11. **Pied de page** signé Christian Couillard avec mention 5PennyAi

**Header / Footer du document** :

- Header : `5PennyAi — Audit IA` aligné à droite, en muted italique
- Footer : `Page X / Y` centré, en muted

**Marges** : 1440 twips de chaque côté (≈ 2,5 cm), format Letter
(12240 × 15840 twips), comme dans `build-report.js`.

**Affirmation de révision conditionnelle** (couplé chantier de la 2C
documenté dans `PROJECT_STATE.md`) : la phrase finale
« Ce rapport a fait l'objet d'une révision humaine par Christian
Couillard avant transmission » ne doit s'inclure dans le mot de
clôture que si :
- `audit.reviewed_at` est non null **ET**
- `audit.admin_notes_global` est non vide **OU** au moins une section
  a un `reviewer_notes` non vide

Sinon, omettre la phrase silencieusement (le ton du paragraphe doit
rester cohérent — le tester en mode « audit non révisé »).

**Pas de TOC automatique** — le document fait 12-15 pages, le découpage
en sections H1/H2 colorées suffit. Si Christian veut un TOC plus tard,
ce sera 5 minutes.

**Validation interne** : à la fin de la fonction, faire passer le
buffer par un check basique (taille > 20 Ko, < 2 Mo, sinon throw).
Pas de validation `validate.py` côté serveur (overkill).

**Critère de réussite** :

- Appeler `buildAuditDocx(auditSophie)` produit un buffer
- Sauvegarder ce buffer en `audit-sophie-test.docx`, l'ouvrir dans
  Word ou LibreOffice → comparer visuellement avec le PDF de référence
- Toutes les sections sont présentes, dans le bon ordre, avec les bons
  contenus dynamiques
- La palette navy/orange/cream est correctement appliquée
- Tester aussi avec l'audit Marc Dubois pour vérifier que le rendu
  s'adapte à un secteur très différent (juridique, ton consultatif,
  pas de banque de prompts dentaire)

---

## Étape 3 — Endpoint de génération

**Objectif** : exposer une route HTTP qui génère et stocke le DOCX.

**Fichier** : `api/admin/audits/[id]/generate-docx.ts`

**Logique** :

1. `requireAdmin(req)` (réutilise le helper de la 2C)
2. Charger l'audit complet depuis Supabase (mêmes jointures que
   `/api/admin/audits/[id]/get`)
3. Appeler `buildAuditDocx(audit)` → buffer
4. Appeler `uploadDocx(auditId, buffer)` → path Storage
5. Mettre à jour `audits.docx_storage_path` et `audits.docx_generated_at`
6. Émettre un event `docx_generated` dans `audit_review_events`
7. Retourner `{ ok: true, storage_path, signed_url }` où `signed_url`
   est obtenue via `getSignedUrl(auditId)` (15 min de validité)

**Comportement si appelé deux fois** : régénère et écrase. Le path
Storage suit le pattern `{audit_id}/audit-{slug-client}-{timestamp}.docx`
pour qu'on garde un historique simple via le timestamp dans le nom.
Optionnel : nettoyer les anciens fichiers du même audit après upload
réussi (à toi de voir, sinon on le fera plus tard).

**Critère de réussite** :

- POST `/api/admin/audits/<sophie-id>/generate-docx` retourne 200
  avec un `signed_url` cliquable
- Cliquer le lien télécharge un fichier `.docx` valide
- En DB : `docx_storage_path` populé, `docx_generated_at` populé,
  event `docx_generated` dans `audit_review_events`

---

## Étape 4 — Intégration dans `approve-and-send`

**Objectif** : quand Christian clique « Approuver et envoyer », le
DOCX est généré, attaché au courriel client, et le statut passe à
`delivered`. La page rapport publique reste fonctionnelle (le client
a deux options : ouvrir le DOCX ou cliquer le lien web).

**Fichier à modifier** : `api/admin/audits/[id]/approve-and-send.ts`
(créé en 2C)

**Modifications** :

1. **Avant** d'envoyer le courriel : appeler `buildAuditDocx(audit)`
   et stocker le path. Si la génération échoue, abort le flux entier
   et retourner une erreur explicite à l'admin (« La génération du DOCX
   a échoué. Vérifie les logs serveur. ») — ne **pas** envoyer le
   courriel sans pièce jointe, c'est une régression UX.
2. **Pendant** l'envoi : ajouter le buffer DOCX comme pièce jointe
   du courriel (Resend/Brevo SDK supporte les attachments en base64
   ou Buffer). Nom du fichier : `audit-{slug-client}.docx`.
3. **Après** l'envoi : statut → `delivered`, `delivered_at = now()`,
   event `sent_to_client` avec `payload.docx_path` dans l'historique.

**Template courriel mis à jour** :

- Mentionner que le rapport est **également joint au courriel**
- Garder le lien vers la page web (toujours utile pour les clients
  qui préfèrent lire au navigateur ou partager avec leur équipe)
- Phrase suggérée : « Vous trouverez votre rapport en pièce jointe et
  également [accessible en ligne ici]({{public_url}}). Le lien web
  reste valide 90 jours. »

**Mode dev** : si `RESEND_API_KEY` est vide, logger en console le
fait que la pièce jointe aurait été incluse, avec sa taille en Ko,
mais sans dump du buffer (illisible). Le DOCX est tout de même stocké
dans Supabase Storage pour permettre la vérification manuelle.

**Critère de réussite** (test bout-en-bout) :

1. Audit en `pending_review`, cliquer « Approuver et envoyer »
2. Confirmer dans la modal
3. Vérifier en console : la pièce jointe apparaît dans le log courriel
4. Vérifier en DB : `docx_storage_path` populé, `delivered_at` populé,
   statut `delivered`
5. Télécharger le fichier depuis Supabase Storage manuellement,
   l'ouvrir dans Word → cohérent avec le PDF de référence
6. Cliquer aussi le lien web → toujours fonctionnel

---

## Étape 5 — Bouton « Télécharger DOCX » dans l'admin

**Objectif** : permettre à Christian de télécharger le DOCX d'un audit
sans devoir relancer un envoi, et de régénérer si besoin (par exemple
après avoir édité une note de section).

**Fichier à modifier** : `src/components/admin/AuditDetailHeader.tsx`
ou `AuditActions.tsx` (créé en 2C)

**UI** :

- Si `audit.docx_storage_path` existe : bouton secondaire
  « Télécharger DOCX » (outline navy) à côté des actions principales.
  Au clic : appelle un endpoint qui retourne une signed URL et déclenche
  le téléchargement (`window.location.href = signed_url` ou ouverture
  d'un nouvel onglet).
- Si `audit.docx_storage_path` n'existe pas : bouton « Générer DOCX »
  (outline navy) qui appelle `/api/admin/audits/[id]/generate-docx` et
  affiche un spinner pendant 3-5 secondes (la génération complète
  prend quelques secondes pour 15 pages).
- Toujours visible : un bouton discret « Régénérer DOCX » (outline
  muted) — utile après avoir édité une note de section pour
  resynchroniser le fichier livrable.

**Endpoint complémentaire** : `GET /api/admin/audits/[id]/docx-url`
qui retourne `{ signed_url, expires_at }` sans rien régénérer. Utilisé
par le bouton « Télécharger ».

**Indicateur de fraîcheur** : sous le bouton, afficher en muted
« Généré il y a 3 minutes » ou « Aucun DOCX généré pour le moment »,
basé sur `docx_generated_at`. Aide Christian à savoir si le fichier
reflète l'état courant de l'audit.

**Critère de réussite** :

- Sur un audit `pending_review` sans DOCX : bouton « Générer DOCX » →
  clic → spinner → bouton remplacé par « Télécharger » + indicateur
  de fraîcheur
- Sur un audit `delivered` (donc DOCX déjà généré) : bouton
  « Télécharger » directement actif
- Bouton « Régénérer » fonctionne et met à jour l'indicateur de
  fraîcheur

---

## Étape 6 — Trois micro-chantiers UI couplés

**Objectif** : épuiser le backlog de polissage de l'admin identifié
dans `PROJECT_STATE.md`. C'est rapide, on le fait tant qu'on a la
tête dedans.

### 6a — Mapping des libellés de secteurs

**Fichier à créer** : `src/lib/labels/industry.ts`

Mapping simple des `industry_vertical` (snake_case) vers libellés
humains français :

```typescript
export const INDUSTRY_LABELS: Record<string, string> = {
  sante_bien_etre: "Santé et bien-être",
  services_professionnels: "Services professionnels",
  commerce_detail: "Commerce de détail",
  restauration: "Restauration",
  immobilier: "Immobilier",
  education_formation: "Éducation et formation",
  // … compléter avec ce que produit le Skill 1 dans intake-form-v1.yaml
};

export function industryLabel(slug: string): string {
  return INDUSTRY_LABELS[slug] ?? slug;
}
```

À utiliser dans `AuditsList.tsx` (colonne Secteur) et dans le DOCX
(page de titre, contexte). Vérifier les valeurs réelles produites
par le pipeline en interrogeant la DB (`SELECT DISTINCT
intake_data->'industry' FROM audits`) avant de figer la liste.

### 6b — Nom de famille client dans la liste admin

**Fichier à modifier** : `src/components/admin/AuditsList.tsx` ou son
endpoint `api/admin/audits/list.ts`

Extraire le nom de famille depuis `intake_data` (nom probable du
champ : `business_owner_lastname` ou `client_lastname` — vérifier
dans `intake-form-v1.yaml`). Si présent, l'afficher après le prénom :
`Marc Dubois` au lieu de juste `Marc`. Si absent, garder le prénom
seul (tolérant aux audits anciens où le champ pourrait manquer).

### 6c — Affirmation de révision conditionnelle

**Déjà couvert à l'Étape 2** dans la logique du `docx-builder.ts`.
Vérifier ici qu'on a aussi ajusté la **page rapport publique** créée
en 2C (`src/pages/public/PublicReport.tsx`) pour appliquer la même
règle de conditionnalité sur la phrase. Sinon le DOCX et la page web
afficheraient des choses différentes — incohérent.

**Critère de réussite** :

- La liste admin affiche « Marc Dubois » et « Sophie Tremblay »,
  pas juste les prénoms
- La colonne Secteur affiche « Santé et bien-être » et « Services
  professionnels »
- Sur un audit non révisé (créer un cas test si besoin), ni le DOCX
  ni la page web n'affichent l'affirmation de révision

---

## Étape 7 — Test bout-en-bout et polissage final

**Objectif** : valider que le flux complet de la 2D + 2C tient debout.

**Scénario de test** :

1. Soumettre un nouvel intake complet (nouvel audit, pas Sophie ni Marc)
2. Le pipeline tourne, statut → `pending_review`
3. Aller dans l'admin, ouvrir l'audit, naviguer les 7 onglets
4. Cliquer « Générer DOCX » → télécharger → ouvrir dans Word →
   vérifier le rendu
5. Ajouter quelques `reviewer_notes` dans 2-3 sections + une note
   globale
6. Cliquer « Régénérer DOCX » → vérifier que la phrase de révision
   apparaît maintenant
7. Cliquer « Approuver et envoyer »
8. Vérifier en console : courriel avec pièce jointe
9. Vérifier en DB : statut `delivered`, `docx_storage_path`,
   `docx_generated_at`, events `docx_generated` + `approved` +
   `sent_to_client`
10. Ouvrir le lien public depuis le log courriel → page web cohérente
11. Télécharger le DOCX depuis Supabase Storage manuellement → ouvrir
    dans LibreOffice (alternative au cas où Word ferme certaines
    erreurs silencieusement) → vérifier qu'aucune corruption

**Polissage** :

- Tous les boutons admin sont disabled pendant les requêtes
- Toasts de succès / erreur sur chaque action (génération, téléchargement)
- Erreur Storage gracieuse : si l'upload échoue (réseau, quota), le
  flux `approve-and-send` échoue proprement, pas en silence
- Documentation : mettre à jour le `README.md` avec une section
  « Génération DOCX » (où est le bucket, comment régénérer manuellement,
  comment debugger en local)

---

## Livrables finaux de la Session 2D

- [x] Bibliothèque `docx` installée et fonctionnelle en Vercel
- [x] Bucket Supabase Storage `audit-reports` créé et privé
- [x] Module `docx-builder.ts` qui produit un DOCX visuellement
      conforme au PDF de référence
- [x] Endpoint `POST /api/admin/audits/[id]/generate-docx`
- [x] Endpoint `GET /api/admin/audits/[id]/docx-url`
- [x] Flux `approve-and-send` joint le DOCX au courriel client
- [x] Boutons admin « Générer / Télécharger / Régénérer DOCX »
- [x] Mapping secteurs en libellés humains
- [x] Nom complet client dans la liste admin
- [x] Affirmation de révision conditionnelle (DOCX + page web)
- [x] `PROJECT_STATE.md` mis à jour (Session 2D ✅)
- [x] `README.md` mis à jour avec section génération DOCX

---

## Ce qui n'est PAS dans la 2D

- **Conversion PDF automatisée** : reportée. Les clients qui veulent un
  PDF ouvrent le DOCX dans Word et exportent eux-mêmes, ou utilisent
  l'impression navigateur de la page publique.
- **Branding logo image** : la 2D garde le placeholder texte
  « 5PENNYAI » en orange. Si Christian veut intégrer un logo PNG/SVG,
  ce sera une mini-tâche de 30 min plus tard quand le logo final sera
  prêt.
- **Templates DOCX différents par secteur** : le rendu est unique pour
  l'instant. La personnalisation sectorielle vient déjà du contenu
  des outputs (le ton et les sections s'adaptent), pas de la structure
  visuelle.
- **Versioning des rapports** : on ne garde qu'une version DOCX par
  audit (la dernière régénérée écrase). Suffisant pour le MVP. Si un
  jour on veut un historique, on ajoutera une table `audit_report_versions`.
- **Téléchargement client** : la pièce jointe courriel suffit. Pas de
  bouton « Télécharger DOCX » sur la page rapport publique pour
  l'instant — à voir si les beta-testeurs le réclament.

---

## Notes techniques

- **Performances** : la génération prend 2-5 secondes pour 15 pages.
  Acceptable en synchrone côté admin. Si on dépasse 10s un jour
  (audit beaucoup plus long), passer en asynchrone avec polling.
- **Limite Vercel** : les fonctions serverless ont une limite de
  mémoire (1024 Mo en Pro). Un DOCX de 15 pages fait ~150-300 Ko en
  mémoire pendant la génération, donc large marge. Pas d'inquiétude.
- **Compatibilité Word** : tester sur Word 2019 minimum (ce que la
  plupart des PME utilisent). LibreOffice et Google Docs comme
  bonus mais pas critique.
- **Encodage** : le français québécois avec accents passe sans
  problème en `docx`, c'est de l'UTF-8 partout. Vérifier quand même
  les caractères spéciaux (apostrophe courbe `’`, tiret cadratin `—`,
  guillemets français `« »`) qui apparaissent souvent dans le rendu
  des skills.

---

## Si quelque chose tourne mal

- **Le DOCX généré est corrompu** : valider d'abord avec
  `python3 /mnt/skills/public/docx/scripts/office/validate.py
  fichier.docx` (script utilisé pour les rapports de référence). Un
  bug fréquent est un caractère mal échappé dans les `TextRun`.
- **Le buffer ne s'upload pas dans Storage** : vérifier que le bucket
  est bien `audit-reports`, que la Service Role Key a les droits
  d'écriture, et que le `content-type` est
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- **Le courriel part sans pièce jointe** : Resend/Brevo a des limites
  de taille sur les attachments (typiquement 10 Mo). Notre DOCX fait
  ~300 Ko, donc OK. Si quand même refusé, vérifier le format
  d'encodage demandé par le SDK (base64 string vs Buffer).
- **Le rendu visuel diffère du PDF de référence** : ouvrir les deux
  côte à côte, identifier précisément ce qui diffère (couleur,
  taille, spacing), patcher dans `docx-builder.ts`. Ne pas inventer
  d'améliorations en passant — la 2D reproduit fidèlement, point.
- **La régénération ne change rien** : vérifier que l'endpoint lit
  bien l'audit à jour depuis la DB (et pas un cache), et que les
  `reviewer_notes` viennent bien des champs JSON imbriqués
  modifiés en 2C, pas des outputs originaux.

---

*Document produit le 25 avril 2026 pour la Session Claude Code 2D.*
*À lire en conjonction avec `DESIGN_SYSTEM.md`, `skills-prompts-v2.yaml`,*
*`PROJECT_STATE.md`, et le script de référence `build-report.js` retrouvable*
*via `conversation_search`.*
