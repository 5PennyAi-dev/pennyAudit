# Instructions Claude Code — Session 2A : Formulaire d'intake

> **Objectif** : Implémenter le formulaire d'intake multi-étapes React, avec
> persistence Supabase progressive et reprise par magic link.
>
> **Durée estimée** : 2-4 heures en session Claude Code
>
> **Livrables** : Formulaire 7 écrans pleinement fonctionnel, données
> persistées dans `audits.intake_data`, reprise d'un formulaire abandonné
> fonctionnelle.

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. Faire un nouveau commit de référence : `git commit -am "session-2a: start"`
3. Donner ce document à Claude Code en contexte initial
4. Procéder **étape par étape**, commit après chaque étape
5. Ne pas sauter d'étapes. Si une étape échoue, corriger avant de passer à la suivante.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Le scaffold Phase 3 est en place et `npm run dev` fonctionne
- [ ] Supabase est connecté, les tables `clients`, `audits`, `patterns` existent
- [ ] Les 5 patterns existants sont seedés dans la table `patterns`
- [ ] Le DESIGN_SYSTEM.md est dans le repo (référence visuelle)
- [ ] Le fichier `docs/specs/intake-form-v1.yaml` est dans le repo
- [ ] Une clé Resend (ou équivalent) est dans `.env` pour l'envoi du magic link

---

## Contexte à charger

Avant de commencer, Claude Code doit lire dans l'ordre :

1. `docs/CONTEXT_PROJET_AUDIT_IA_5PENNYAI.md` — vision globale du projet
2. `docs/DESIGN_SYSTEM.md` — tokens visuels, composants, règles UX
3. `docs/specs/intake-form-v1.yaml` — **spec complète du formulaire** (source de vérité)
4. Le schéma Supabase actuel (table `audits`)

---

## Étape 1 — Types TypeScript du formulaire

**Objectif** : Générer les types qui reflètent fidèlement la spec YAML.

**Fichier à créer** : `src/types/intake.ts`

**Actions** :
- Créer un type `IntakeFormData` avec tous les field_id du YAML comme clés
- Créer des types pour chaque option enum (industry, company_size, revenue_model, etc.)
- Créer un type `ScreenId` pour identifier les 7 écrans
- Créer un type `FormValidationError` pour les erreurs inline
- Créer un type `IntakeFormState` qui combine data + currentScreen + errors + isSubmitting
- Exporter tous les types

**Critère de réussite** : `npm run typecheck` passe sans erreur sur le fichier.

---

## Étape 2 — Composants de champs réutilisables

**Objectif** : Créer la bibliothèque de composants de formulaire, alignés
sur le DESIGN_SYSTEM.md.

**Dossier à créer** : `src/components/form-fields/`

**Fichiers à créer** :
- `TextInput.tsx` — input text avec label, helper, error
- `TextAreaInput.tsx` — textarea avec compteur de caractères (utile pour `time_consuming_tasks` qui a `min_length: 50`)
- `EmailInput.tsx` — input email avec validation regex inline
- `UrlInput.tsx` — input url avec validation de format si rempli
- `RadioGroup.tsx` — groupe de boutons radio stylisés (type "bouton carré" plutôt que cercle classique, pour tactile)
- `SelectDropdown.tsx` — dropdown accessible (supporte le champ conditionnel "autre → préciser")
- `MultiSelectCheckboxes.tsx` — liste de cases à cocher (pour contact_channels, current_tools, lost_opportunities)
- `CheckboxSingle.tsx` — case à cocher unique (pour terms_acceptance, marketing_consent)

**Conventions communes à tous les composants** :
- Props : `id`, `label`, `helperText?`, `required`, `error?`, `value`, `onChange`, `disabled?`
- Label toujours au-dessus du champ
- Helper text (gris, plus petit) sous le champ
- Error message (rouge, icône) sous le helper quand `error` est présent
- Focus ring utilisant Orange 500 (accent)
- Responsive mobile par défaut (largeur 100%)
- Respecter les tokens Tailwind configurés en Phase 3 (ne pas hardcoder les couleurs)

**Critère de réussite** : Les 8 composants existent, sont exportés depuis `index.ts`, et chacun a un test de rendu minimal (snapshot ou juste "rendre sans crash").

---

## Étape 3 — Barre de progression et navigation

**Objectif** : Les éléments transversaux qui entourent les 7 écrans.

**Fichiers à créer** :
- `src/components/form/ProgressBar.tsx` — affichage "Étape X sur 7" + barre visuelle
- `src/components/form/FormNavigation.tsx` — boutons Précédent/Suivant
- `src/components/form/EstimatedTimeRemaining.tsx` — "Environ X minutes restantes"

**Spécifications** :
- `ProgressBar` : barre remplie en Orange 500 sur fond Navy 100
- `FormNavigation` : bouton "Précédent" (outline) à gauche, bouton "Suivant" (solid Orange) à droite
- "Précédent" caché sur l'écran 1, "Suivant" remplacé par "Lancer mon audit" sur l'écran 7
- `EstimatedTimeRemaining` : calcul basé sur screens restants × 45 secondes par écran

**Critère de réussite** : Les 3 composants sont visuellement alignés avec la landing et le design system.

---

## Étape 4 — Store de formulaire (Zustand)

**Objectif** : État global du formulaire, avec auto-save.

**Fichier à créer** : `src/stores/intakeFormStore.ts`

**État à gérer** :
- `formData` : tout le contenu des 19 questions
- `currentScreen` : écran affiché actuellement (1-7)
- `errors` : erreurs de validation par field_id
- `auditId` : uuid de la ligne `audits` en DB (créée au premier save)
- `isSaving` : flag pour indicateur UI
- `lastSavedAt` : timestamp

**Actions** :
- `setField(fieldId, value)` — met à jour un champ
- `validateScreen(screenId)` — valide tous les champs d'un écran, retourne boolean + errors
- `goToScreen(screenId)` — navigation avec validation préalable
- `saveProgress()` — POST vers `/api/intake/save` (créé à l'étape 8)
- `loadFromResumeToken(token)` — GET vers `/api/intake/resume/:token`
- `resetForm()` — nettoie tout l'état

**Règles de validation** :
- Les champs `required: true` doivent être remplis
- `email` : regex standard
- `url` : validation si rempli
- `textarea` avec `min_length` : compte les caractères
- `multi_select` avec `min_selected: 1` : au moins une option cochée

**Critère de réussite** : Le store fonctionne en isolation (tests de reducer basiques).

---

## Étape 5 — Écran 1 (Bienvenue + email)

**Fichier à créer** : `src/pages/intake/Screen1Welcome.tsx`

**Contenu** :
- Titre grand : "Commençons votre audit IA"
- Description (du YAML)
- `TextInput` pour `first_name` (required)
- `EmailInput` pour `email` (required)
- Note de confidentialité sous l'email
- `FormNavigation` avec seulement "Suivant" actif

**Critère de réussite** :
- L'écran est accessible à `/intake` si routing configuré
- Les deux champs valident leur format
- "Suivant" est désactivé tant que les champs requis ne sont pas valides

---

## Étape 6 — Écrans 2 à 6 (Blocs 1-5)

**Objectif** : Implémenter les 5 écrans de questions principales.

**Fichiers à créer** :
- `src/pages/intake/Screen2Business.tsx` — Bloc 1 (5 questions sur l'entreprise)
- `src/pages/intake/Screen3Operations.tsx` — Bloc 2 (4 questions sur les opérations)
- `src/pages/intake/Screen4Challenges.tsx` — Bloc 3 (3 questions sur les défis)
- `src/pages/intake/Screen5TechStack.tsx` — Bloc 4 (3 questions sur le stack)
- `src/pages/intake/Screen6Resources.tsx` — Bloc 5 (4 questions sur les ressources)

**Pour chaque écran** :
- Utiliser `ProgressBar` en haut
- Titre + description du bloc (du YAML)
- Composants de champs appropriés selon le `type` dans le YAML
- `EstimatedTimeRemaining` en bas à droite
- `FormNavigation` en bas (Précédent + Suivant)
- Validation au clic "Suivant" : si erreurs, les afficher et rester sur l'écran
- Auto-focus sur le premier champ à l'arrivée

**Cas particulier — Écran 2** :
- `industry` avec option "autre" déclenche l'affichage conditionnel de `industry_other`

**Cas particulier — Écran 4** :
- `lost_opportunities` avec option "autre" déclenche l'affichage conditionnel de `lost_opportunities_detail`

**Critère de réussite** : Tu peux naviguer à travers les 5 écrans, remplir les champs, voir les erreurs inline quand tu essaies de passer sans remplir, et revenir en arrière sans perdre les données saisies.

---

## Étape 7 — Écran 7 (Confirmation + lancement)

**Fichier à créer** : `src/pages/intake/Screen7Confirmation.tsx`

**Contenu** :
- Titre : "Prêt(e) à recevoir votre audit ?"
- Récapitulatif visuel de ce que le client a fourni (cards par bloc, modifiables via bouton "Modifier" qui ramène à l'écran concerné)
- `CheckboxSingle` `terms_acceptance` (required)
- `CheckboxSingle` `marketing_consent` (optional, avec helper text)
- Bouton CTA grand format : "Lancer mon audit"
- Le clic sur le CTA :
  - En Session 2A : log dans console + redirige vers `/intake/submitted` (page d'attente temporaire)
  - En Session 2B : POST vers `/api/audit/run` et redirige vers l'écran de progression SSE

**Critère de réussite** : L'utilisateur peut voir toutes ses réponses, les modifier, accepter les conditions, et cliquer sur le CTA.

---

## Étape 8 — Persistence progressive Supabase

**Objectif** : Sauvegarder automatiquement à chaque transition d'écran.

**Fichiers à créer** :
- `api/intake/save.ts` — Vercel serverless POST endpoint
- `api/intake/resume/[token].ts` — Vercel serverless GET endpoint
- `src/lib/supabase/intake.ts` — wrappers côté client

**Logique `/api/intake/save`** :
- Input : `{ auditId?, formData, currentScreen, email }`
- Si `auditId` absent et email présent :
  - Chercher ou créer un `client` avec cet email
  - Créer un `audit` avec status = 'draft', intake_data = formData, current_screen = currentScreen
  - Retourner le nouveau `auditId`
- Si `auditId` présent :
  - Update le row existant (intake_data = formData, current_screen = currentScreen)
  - Retourner `{ success: true }`
- Gérer le cas d'erreur (email déjà associé à un autre audit en cours, etc.)

**Logique côté store** :
- Après chaque `goToScreen` réussi, appeler `saveProgress()` en fire-and-forget
- Afficher un petit indicateur "Sauvegardé" qui disparaît après 2 secondes

**Critère de réussite** :
- Un enregistrement `audits` avec `status='draft'` est créé quand l'utilisateur passe de l'écran 1 à l'écran 2
- L'enregistrement est mis à jour à chaque transition d'écran
- Si tu rafraîchis la page avec l'auditId en localStorage, les données sont rechargées

---

## Étape 9 — Magic link pour reprendre

**Objectif** : Permettre à un utilisateur qui a abandonné de reprendre son formulaire là où il l'a laissé.

**Fichiers à créer** :
- `api/intake/send-resume-link.ts` — endpoint qui génère un token et envoie un courriel
- `src/pages/intake/ResumeFromToken.tsx` — page qui charge l'état depuis un token
- `src/lib/email/resume-template.ts` — template du courriel

**Logique** :
- Après le premier save de progress, si l'utilisateur ferme l'onglet OU après 10 minutes d'inactivité, envoyer un courriel
- Token généré : JWT signé avec secret, expire 7 jours, contient `auditId`
- Courriel en français, ton chaleureux, lien unique :
  - Sujet : "Votre audit IA 5PennyAi — Reprenez où vous en étiez"
  - Corps : "Bonjour [prénom], il vous reste quelques questions à compléter. Cliquez ici pour reprendre votre audit."
  - Lien : `https://5pennyai.com/intake/resume/[token]`
- Route `/intake/resume/:token` :
  - Valide le token
  - Charge `formData` et `currentScreen` depuis `audits` via `auditId`
  - Redirige vers l'écran où l'utilisateur était

**Provider de courriel** : utiliser Resend (si déjà configuré en Phase 3) ou Brevo.

**Critère de réussite** :
- Tu remplis le formulaire jusqu'à l'écran 3, tu fermes l'onglet
- 10 minutes plus tard (ou manuellement via `/api/intake/send-resume-link`), tu reçois un courriel
- Le lien du courriel te ramène sur l'écran 3 avec tes données intactes

---

## Étape 10 — Route principale + test bout-en-bout

**Objectif** : Intégrer le tout et valider le flux complet.

**Actions** :
- Ajouter la route `/intake` au routeur (React Router ou Next.js selon ce qui a été choisi en Phase 3)
- Ajouter la route `/intake/resume/:token`
- Ajouter la route `/intake/submitted` (page d'attente temporaire, sera remplacée en Session 2B)
- Créer un bouton "Faire mon audit gratuit" dans la landing HTML existante (si portée en React) ou juste un lien
- Vérifier la responsivité mobile sur iPhone SE (< 375px) et desktop (> 1200px)

**Test bout-en-bout à effectuer manuellement** :
1. Aller sur `/intake`
2. Remplir l'écran 1 avec un vrai email
3. Passer à l'écran 2, vérifier dans Supabase qu'un row `audits` avec `status='draft'` est créé
4. Remplir les écrans 2-6 complètement
5. Arriver à l'écran 7, voir le récapitulatif, vérifier qu'il correspond
6. Cliquer "Modifier" sur un bloc, changer une réponse, revenir à l'écran 7
7. Accepter les conditions, cliquer "Lancer mon audit"
8. Vérifier la redirection vers `/intake/submitted`

**Test de reprise** :
1. Démarrer un nouveau formulaire, aller jusqu'à l'écran 3, fermer l'onglet
2. Forcer l'envoi du courriel de reprise (bouton dev en local)
3. Cliquer le lien du courriel
4. Vérifier que tu arrives à l'écran 3 avec tes données précédentes

**Critère de réussite** : Les deux tests passent sans erreur, et les données en DB correspondent à ce qui a été saisi.

---

## Livrables finaux de la Session 2A

Après cette session, le repo doit contenir :

- [x] `src/types/intake.ts` — types TypeScript complets
- [x] `src/components/form-fields/` — 8 composants réutilisables
- [x] `src/components/form/` — ProgressBar, FormNavigation, EstimatedTimeRemaining
- [x] `src/stores/intakeFormStore.ts` — store Zustand complet
- [x] `src/pages/intake/` — 7 écrans + page ResumeFromToken + page Submitted
- [x] `api/intake/save.ts`, `api/intake/resume/[token].ts`, `api/intake/send-resume-link.ts`
- [x] `src/lib/supabase/intake.ts`, `src/lib/email/resume-template.ts`
- [x] Routes ajoutées au routeur principal
- [x] Variables d'environnement documentées dans `.env.example`
- [x] `README.md` mis à jour avec instructions de test local

---

## Ce qui n'est PAS dans la Session 2A

Pour éviter toute confusion, ces éléments seront traités en Session 2B :

- Le pipeline des 5 skills (backend)
- L'orchestration `/api/audit/run` avec SSE
- L'écran de progression temps réel
- La transition vers le statut `pending_review`
- La notification courriel à Christian quand un audit attend revue

Le CTA "Lancer mon audit" de l'écran 7 ne fait que rediriger vers `/intake/submitted`
en Session 2A. En Session 2B, il déclenchera vraiment le pipeline.

---

## Notes et rappels

- **Tokens visuels** : ne jamais hardcoder les couleurs. Toujours utiliser les
  classes Tailwind configurées (ex: `bg-navy-600`, `text-orange-500`) ou les
  variables CSS définies dans le design system.
- **Bilinguisme** : le formulaire est FR-only pour le MVP. Tous les labels,
  placeholders, messages d'erreur sont en français. Ne pas introduire i18next
  à ce stade.
- **Accessibilité** : respecter les règles de base (labels associés aux inputs,
  aria-required, focus visible, navigation clavier). Pas d'audit a11y complet
  mais pas de régression non plus.
- **Commit après chaque étape** avec un message clair : `session-2a: step N - description`
- **Rollback facile** : si une étape casse quelque chose, `git reset --hard HEAD~1` et reprendre.

---

## Si quelque chose tourne mal

- Si Claude Code a des doutes sur une décision, il peut l'indiquer explicitement
  au lieu de deviner. On ajustera ensemble au retour.
- Si une étape semble ambiguë, privilégier la lecture directe de `intake-form-v1.yaml`
  — c'est la source de vérité.
- Si Supabase rejette un write, vérifier les RLS policies (activées ou désactivées pour le MVP ?).
- Si l'envoi de courriel échoue, s'assurer que la clé API Resend est correcte et
  que le domaine expéditeur est vérifié.

---

*Document produit le 23 avril 2026 pour la Session Claude Code 2A.*
*À lire en conjonction avec intake-form-v1.yaml et DESIGN_SYSTEM.md.*
