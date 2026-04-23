# Instructions pour Claude Code — Initialisation du projet 5PennyAi Audit

> **Version 2.0 — Séparation claire entre actions manuelles et prompts Claude Code**
>
> Ce document contient 10 étapes pour construire le MVP de l'application.
> Chaque étape est divisée en deux sections :
>
> **🙋 Ce que TU fais** — Actions manuelles (terminal, Supabase, navigateur, etc.)
>
> **🤖 Ce que TU demandes à Claude Code** — Prompts à copier-coller dans Claude Code
>
> **Ordre important** : fais toujours la section 🙋 avant la section 🤖 dans chaque étape, sauf indication contraire.

---

## Avant de commencer

### 🙋 Prérequis à avoir en main

Avant de lancer la première étape, assure-toi d'avoir :

- [ ] **Node.js 20+** installé (`node --version` dans ton terminal doit afficher v20 ou plus)
- [ ] **VS Code** installé avec l'extension **Claude Code** activée
- [ ] **Un dossier projet créé** (`pennyaudit/`) avec la structure de base (Phase 2 de MARCHE_A_SUIVRE.md)
- [ ] **Le fichier `.claude/CLAUDE.md`** créé avec les instructions permanentes
- [ ] **Les fichiers de référence** copiés dans `docs/` (DESIGN_SYSTEM.md, CONTEXT_PROJET.md, landing-mockup.html)
- [ ] **Les 5 fichiers YAML** copiés dans `patterns/`
- [ ] **Le projet Supabase créé** avec le schéma SQL exécuté (Phase 1 de MARCHE_A_SUIVRE.md)
- [ ] **Les clés API** récupérées et sauvegardées dans un endroit sûr :
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - VOYAGE_API_KEY
  - ANTHROPIC_API_KEY

Si un de ces éléments manque, complète-le avant de continuer.

### 🤖 Premier contact avec Claude Code

**Ouvre Claude Code dans VS Code** (Cmd+Shift+P → « Claude Code: Open Chat » ou via l'icône dans la barre latérale).

**Copie-colle ce prompt d'introduction** :

```
Je démarre un nouveau projet d'application web. Avant de commencer à
coder quoi que ce soit, lis les fichiers suivants dans l'ordre pour
comprendre le contexte complet :

1. .claude/CLAUDE.md (tes instructions permanentes)
2. docs/CONTEXT_PROJET.md (contexte stratégique du projet)
3. docs/DESIGN_SYSTEM.md (spécifications visuelles)
4. docs/landing-mockup.html (mockup de référence à reproduire)

Une fois que tu as tout lu, confirme-moi brièvement :
- Le nom du projet et son objectif
- La stack technique choisie
- La palette de couleurs principale
- Les 2 polices à utiliser

Ne commence PAS encore à coder. Attends mes instructions étape par étape.
```

Claude Code va lire les fichiers et te confirmer ce qu'il a compris. Si ses réponses ne correspondent pas à ce qu'il devrait savoir, recharge les fichiers et redemande. **Ne passe à l'Étape 1 que quand il a bien intégré le contexte.**

---

## ÉTAPE 1 — Initialisation du projet Vite

### 🙋 Ce que TU fais

**Rien directement.** Cette étape est entièrement prise en charge par Claude Code qui va exécuter les commandes terminal lui-même via son intégration VS Code.

Tu as juste à **observer** les commandes qu'il exécute et **valider** quand il te demande confirmation pour des opérations sensibles.

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 1 : Initialisation du projet Vite

Dans le dossier courant (qui doit être pennyaudit/), exécute les
commandes suivantes :

1. Initialise un projet Vite avec le template React + TypeScript :
   npm create vite@latest . -- --template react-ts
   (note le point après latest pour installer dans le dossier courant)

2. Installe les dépendances de base :
   npm install

3. Installe les dépendances du projet (runtime) :
   npm install @supabase/supabase-js @anthropic-ai/sdk voyageai
   npm install react-router-dom
   npm install react-i18next i18next i18next-browser-languagedetector
   npm install js-yaml clsx tailwind-merge
   npm install @stripe/stripe-js

4. Installe les dépendances de dev :
   npm install -D tailwindcss@next @tailwindcss/vite
   npm install -D @types/js-yaml dotenv

5. Crée la structure de dossiers dans src/ :
   src/components/layout/
   src/components/ui/
   src/components/audit/
   src/components/landing/
   src/components/intake/
   src/components/report/
   src/pages/
   src/locales/fr/
   src/locales/en/
   src/lib/
   src/hooks/
   src/types/
   src/styles/

6. Crée un fichier .env.example (SANS valeurs, juste les clés) à la
   racine du projet avec :

   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_STRIPE_PUBLIC_KEY=
   # Côté serveur uniquement
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   VOYAGE_API_KEY=
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=

7. Ajoute .env à .gitignore (vérifie qu'il n'y est pas déjà). .env.example
   doit rester commité.

8. Lance un commit Git initial :
   git add .
   git commit -m "Initial Vite + React + TypeScript setup"

Fais toutes ces étapes et dis-moi quand c'est fini. N'installe rien d'autre
que ce qui est listé.
```

### ✅ Validation avant de passer à l'Étape 2

**Toi, tu vérifies** :
- [ ] Le dossier `node_modules/` existe
- [ ] Le fichier `package.json` contient toutes les dépendances listées
- [ ] Le fichier `.env.example` existe à la racine
- [ ] `.env` est bien dans `.gitignore`
- [ ] La structure de dossiers `src/components/`, `src/locales/`, etc. est créée

Lance `npm run dev` dans le terminal — tu devrais voir la page Vite par défaut sur http://localhost:5173. Ferme le serveur avec Ctrl+C avant de continuer.

---

## ÉTAPE 2 — Configuration Tailwind v4 avec le design system

### 🙋 Ce que TU fais

**Rien directement.** Claude Code va tout faire.

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 2 : Configuration de Tailwind CSS v4 avec les tokens du design system

🎨 UTILISE LE SKILL `frontend-design` POUR CETTE TÂCHE.

1. Configure Vite pour utiliser Tailwind v4 en modifiant vite.config.ts :

   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import tailwindcss from '@tailwindcss/vite';
   import path from 'path';

   export default defineConfig({
     plugins: [react(), tailwindcss()],
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
       },
     },
   });

2. Crée le fichier src/styles/index.css avec la directive Tailwind et
   tous les tokens du design system de 5PennyAi. Utilise les tokens
   exacts définis dans docs/DESIGN_SYSTEM.md section "Palette principale"
   et "Typographie" (navy, orange, cream, paper, line, muted, success,
   warning, danger, font-sans, font-mono, ainsi que les shadows custom).

3. Modifie src/main.tsx pour :
   - Importer './styles/index.css'
   - Supprimer l'import de l'ancien CSS par défaut (src/App.css ou src/index.css)

4. Supprime les fichiers CSS par défaut non utilisés (App.css et l'ancien
   index.css si présent).

5. Modifie index.html pour ajouter les polices Google Fonts dans le <head> :
   - Plus Jakarta Sans (weights: 400, 500, 600, 700, 800)
   - JetBrains Mono (weights: 400, 500)
   Utilise les balises preconnect pour la performance.

6. Crée src/lib/utils.ts avec la fonction cn() utilisant clsx et
   tailwind-merge :

   import { clsx, type ClassValue } from 'clsx';
   import { twMerge } from 'tailwind-merge';

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }

7. Modifie src/App.tsx pour afficher une page de test qui valide que
   Tailwind est bien configuré :
   - Fond navy-600
   - Titre "Test Tailwind v4" en Plus Jakarta Sans, blanc, taille large
   - Bouton orange-500 avec texte blanc
   - Texte secondaire en JetBrains Mono couleur cream

8. Lance npm run dev et dis-moi si la page de test s'affiche correctement
   avec les bonnes couleurs et polices.

Respecte TOUS les tokens définis dans docs/DESIGN_SYSTEM.md sans
inventer de nouvelles valeurs.
```

### ✅ Validation avant de passer à l'Étape 3

**Toi, tu vérifies** dans le navigateur sur http://localhost:5173 :
- [ ] La page est sur fond bleu marine foncé (navy-600, presque noir-bleu)
- [ ] Le titre est en Plus Jakarta Sans (police moderne, pas générique)
- [ ] Le bouton est bien orange vif
- [ ] Le texte en mono est bien en JetBrains Mono (largeur fixe)

Si les couleurs ne correspondent pas, demande à Claude Code de vérifier les valeurs hexadécimales dans `src/styles/index.css` et de les aligner sur `docs/DESIGN_SYSTEM.md`.

---

## ÉTAPE 3 — Configuration Supabase

### 🙋 Ce que TU fais

**1. Prépare ton fichier `.env`**

Dans le dossier racine du projet `pennyaudit/`, crée le fichier `.env` (pas `.env.example`, un vrai `.env`). Tu peux le faire :
- Via VS Code : clic droit dans l'arborescence → New File → nomme-le `.env`
- Via terminal : `touch .env` (macOS/Linux) ou `echo $null > .env` (PowerShell Windows)

**2. Ajoute tes 3 clés Supabase dans `.env`** :

```
VITE_SUPABASE_URL=https://ton-projet-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...ta-anon-key-complete
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...ta-service-role-key-complete
```

Remplace évidemment les valeurs par tes vraies clés récupérées précédemment.

**3. Vérifie que le schéma SQL a bien été exécuté dans Supabase**

Si pas déjà fait :
- Va dans ton projet Supabase → SQL Editor → New query
- Ouvre `sql/schema.sql` (ou `supabase-schema.sql` selon où tu l'as placé)
- Copie tout le contenu dans l'éditeur Supabase
- Clique « Run »
- Va dans Table Editor → tu dois voir 5 tables : `clients`, `audits`, `patterns`, `audit_templates`, `audit_logs`

**4. Vérifie que les 2 Storage Buckets existent**

Dans Supabase → Storage :
- [ ] `audit-reports` (privé)
- [ ] `audit-assets` (public)

**5. Important : modifie la dimension vectorielle du schéma**

Dans Supabase → SQL Editor → New query, exécute :

```sql
ALTER TABLE patterns ALTER COLUMN embedding TYPE VECTOR(1024);
```

Cette commande est nécessaire parce que Voyage-3 produit des embeddings en 1024 dimensions (pas 1536 comme le schéma initial). Sans ça, le seed des patterns plantera.

### 🤖 Ce que TU demandes à Claude Code

**Une fois ton `.env` créé et tes tables vérifiées, copie-colle ce prompt** :

```
ÉTAPE 3 : Configuration du client Supabase dans l'application

1. Crée le fichier src/lib/supabase.ts avec un client Supabase initialisé
   à partir des variables d'environnement VITE_SUPABASE_URL et
   VITE_SUPABASE_ANON_KEY. Gère le cas où les variables sont manquantes
   en lançant une erreur explicite au démarrage.

2. Crée le fichier src/types/database.ts avec les types TypeScript
   correspondant aux 5 tables du schéma Supabase (clients, audits,
   patterns, audit_templates, audit_logs). Base-toi sur les colonnes
   définies dans sql/schema.sql.

   Pour chaque table, crée deux types :
   - Le type Row (ce qu'on lit de la DB)
   - Le type Insert (ce qu'on envoie à la DB, avec les champs optionnels)

3. Crée un fichier src/pages/TestSupabase.tsx qui :
   - Importe le client supabase depuis src/lib/supabase.ts
   - Au chargement, fait un SELECT * FROM audit_templates
   - Affiche le résultat dans un <pre> avec JSON.stringify
   - Affiche une erreur en rouge si la requête échoue

4. Ajoute une route temporaire à /test-supabase dans src/App.tsx qui
   charge cette page.

5. Demande-moi de vérifier que la connexion fonctionne et que la requête
   retourne 5 lignes de templates.

Respecte le design system (texte en muted, container centré avec padding,
etc.) même sur cette page de test.
```

### ✅ Validation avant de passer à l'Étape 4

**Toi, tu vérifies** :

1. Relance `npm run dev`
2. Va sur http://localhost:5173/test-supabase
3. Tu dois voir un JSON avec 5 entrées correspondant aux 5 templates de skills

**Si tu vois une erreur** :
- « Missing environment variables » → ton `.env` n'est pas bien lu. Redémarre le serveur (`Ctrl+C` puis `npm run dev`)
- « relation "audit_templates" does not exist » → le schéma SQL n'a pas été exécuté correctement
- « Invalid API key » → la clé dans `.env` n'est pas la bonne

Demande à Claude Code de t'aider à déboguer en lui disant l'erreur exacte.

---

## ÉTAPE 4 — Configuration i18next pour FR/EN

### 🙋 Ce que TU fais

**Rien.** Claude Code fait tout.

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 4 : Configuration du bilinguisme FR/EN avec react-i18next

1. Crée src/lib/i18n.ts qui configure i18next avec :
   - fallbackLng: 'fr'
   - supportedLngs: ['fr', 'en']
   - Namespaces: common, landing, intake, report, dashboard, errors
   - Détection de langue via localStorage puis navigator
   - Pas d'échappement HTML (escapeValue: false)

2. Crée les fichiers de traductions suivants :

   src/locales/fr/common.json avec les clés pour :
   - nav (why, how, pricing, examples, startAudit)
   - cta (startAudit, viewExample, continue, back, cancel, submit)
   - status (processing, completed, pending, failed)
   - common (loading, error, success, save, delete, edit)

   src/locales/en/common.json avec les traductions anglaises correspondantes.

   Pour chaque clé, le texte français doit être naturel et québécois
   (ex: "courriel" plutôt que "email" où applicable).

3. Importe i18n dans src/main.tsx AVANT le ReactDOM.createRoot. Cela
   doit être la première ligne d'import après React.

4. Crée src/components/ui/LanguageSwitcher.tsx qui affiche un petit pill
   avec FR | EN. Le style doit ressembler au switch dans la nav du mockup
   landing-mockup.html (font-mono, petit, bordure discrète, active en
   blanc sur fond semi-transparent).

   Le composant doit :
   - Afficher la langue active en gras/coloré
   - Changer la langue avec i18n.changeLanguage() au clic
   - Sauvegarder la préférence dans localStorage

5. Modifie src/pages/TestSupabase.tsx pour inclure :
   - Un LanguageSwitcher en haut de la page
   - Un titre utilisant la traduction : {t('common.loading')} ou équivalent
   - Démontre que changer la langue change le texte affiché

6. Demande-moi de tester en cliquant le switcher FR/EN.

Respecte le design system pour le LanguageSwitcher. Pas de librairie UI
externe, uniquement Tailwind.
```

### ✅ Validation avant de passer à l'Étape 5

**Toi, tu vérifies** :
- [ ] Le switcher FR/EN est visible sur `/test-supabase`
- [ ] Cliquer sur EN change le texte affiché
- [ ] Rafraîchir la page conserve la langue choisie (localStorage fonctionne)
- [ ] Le style du switcher ressemble au mockup

---

## ÉTAPE 5 — Composants UI de base

### 🙋 Ce que TU fais

**Rien directement.** Mais prépare-toi à valider visuellement un à un les composants.

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 5 : Création des composants UI de base

🎨 UTILISE LE SKILL `frontend-design` POUR CETTE TÂCHE.

Je veux des composants distinctifs, soignés, pas génériques. Chaque
composant doit respecter scrupuleusement le design system documenté
dans docs/DESIGN_SYSTEM.md.

Crée les composants suivants en TypeScript + Tailwind :

1. src/components/ui/Button.tsx
   - Props: variant ('primary' | 'ghost' | 'ghost-dark'), size ('md' | 'lg'),
     children, onClick, disabled, className (optionnel), type
   - Variant primary: bg-orange-500, hover bg-orange-600, texte blanc,
     shadow orange au hover
   - Variant ghost: bg-transparent, border line, texte navy-600, hover
     bg-cream
   - Variant ghost-dark: pour usage sur fond sombre, border blanc/30%,
     texte blanc
   - Size md: px-5 py-2.5 text-sm
   - Size lg: px-6 py-3.5 text-base
   - Hover: translateY(-1px) + transition fluide
   - Utilise cn() de src/lib/utils.ts pour fusionner les classes

2. src/components/ui/Card.tsx
   - Props: variant ('default' | 'cream' | 'featured'), children, className
   - Default: bg-white, border line, rounded-2xl, p-9
   - Cream: bg-cream, border line
   - Featured: bg-navy-600, texte blanc, border orange-500 (2px),
     scale-[1.03], shadow dramatique
   - Hover: translateY(-4px) + shadow-card-hover

3. src/components/ui/Badge.tsx
   - Props: variant ('eyebrow' | 'tag-primary' | 'tag-secondary' | 'status'),
     children, withDot (bool optionnel)
   - Eyebrow: orange-500 sur orange-50, font-mono, uppercase, avec point
     orange pulsant à gauche si withDot=true
   - Tag-primary: blanc sur orange-500
   - Tag-secondary: blanc sur navy-600
   - Status: green sur green-50 avec point pulsant

4. src/components/ui/Input.tsx
   - Props standards + label, error, helperText
   - Height 44px (h-11), border 1.5px line, rounded-lg
   - Focus: border orange-500 (2px) + ring orange-500/20
   - Error: border danger, helperText en danger
   - Label au-dessus, helperText en dessous en muted
   - Font-size 16px (évite zoom iOS)
   - Utilise forwardRef pour permettre la gestion de refs

5. src/components/ui/ProgressBar.tsx
   - Props: value (0-100), animated (bool), showLabel (bool)
   - Hauteur 6px (h-1.5), fond line, rounded-full
   - Fill: gradient orange-500 → orange-600
   - Si animated=true, anime la largeur en boucle (utile pour le mockup
     d'audit en cours)
   - Si showLabel=true, affiche "X%" à droite en font-mono

6. src/components/ui/StepIndicator.tsx
   - Props: state ('pending' | 'active' | 'done'), number
   - Cercle 26px × 26px
   - Pending: bg-cream, border-line, texte muted
   - Active: bg-orange-500, texte blanc, ring orange-500/20 de 4px
   - Done: bg-navy-600, texte blanc avec coche ✓

Crée ensuite src/pages/ComponentsDemo.tsx qui affiche TOUS ces composants
dans toutes leurs variantes, avec des titres de section clairs.

Ajoute la route /components-demo dans App.tsx.

Demande-moi de vérifier visuellement que tous les composants respectent
le design system et sont soignés (pas d'effets par défaut de Tailwind,
animations fluides, cohérence visuelle).
```

### ✅ Validation avant de passer à l'Étape 6

**Toi, tu vérifies** sur http://localhost:5173/components-demo :

- [ ] Les 3 variantes de Button (primary orange, ghost, ghost-dark) sont visibles
- [ ] Les 3 variantes de Card (default, cream, featured) sont visibles
- [ ] Les 4 variantes de Badge sont visibles
- [ ] Un Input avec label et helperText, un avec état d'erreur
- [ ] Une ProgressBar statique et une animée
- [ ] Les 3 états de StepIndicator

**Critères de qualité** :
- Les hover states fonctionnent (passe la souris sur les boutons et cards)
- Les animations sont fluides, pas saccadées
- Les couleurs correspondent aux spécifications
- Aucun composant ne ressemble à « du Tailwind par défaut »

Si quelque chose cloche, demande à Claude Code de retravailler ce composant précis.

---

## ÉTAPE 6 — Layout global et Routing

### 🙋 Ce que TU fais

**Rien directement.**

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 6 : Layout global, navigation et routing

🎨 UTILISE LE SKILL `frontend-design` POUR CETTE TÂCHE.

1. Crée src/components/layout/Nav.tsx qui reproduit la nav du mockup
   docs/landing-mockup.html :
   - Fond navy-600
   - Sticky en haut avec blur léger au scroll
   - Logo "5Penny" + "Ai" en orange
   - Liens Pourquoi, Comment ça marche, Tarifs, Exemples
   - LanguageSwitcher
   - Bouton orange "Lancer un audit"
   - Version mobile : menu hamburger qui ouvre un drawer

2. Crée src/components/layout/Footer.tsx qui reproduit le footer du mockup :
   - Fond navy-800
   - Copyright gauche, liens Contact/Conditions/Confidentialité droite
   - Font-mono, taille 13px

3. Crée src/components/layout/Container.tsx :
   - Max-width 1280px
   - Padding horizontal: px-8 desktop, px-6 mobile
   - Mx-auto

4. Crée src/components/layout/PublicLayout.tsx qui combine Nav + Outlet
   + Footer pour les pages publiques.

5. Configure React Router v6 dans src/App.tsx avec les routes suivantes :

   / → Landing (à créer en Étape 7)
   /audit/new → IntakeForm (placeholder "À construire")
   /audit/:id/processing → ProcessingScreen (placeholder)
   /audit/:id/report → Report (placeholder)
   /dashboard → Dashboard (placeholder, authentifié)
   /login → Login (placeholder)
   /signup → Signup (placeholder)
   /admin → AdminDashboard (placeholder, authentifié)
   /components-demo → ComponentsDemo (existant)
   /test-supabase → TestSupabase (existant)

   Pour les pages qui ne sont pas encore construites, crée des placeholders
   qui affichent simplement le nom de la page en grand avec "À construire".

6. Les pages publiques utilisent PublicLayout. Les pages authentifiées
   utiliseront un DashboardLayout qu'on créera plus tard (pour l'instant
   mets-les dans PublicLayout).

7. Toutes les traductions de la nav et du footer doivent passer par
   useTranslation(). Ajoute les clés nécessaires dans common.json FR et EN.

Respecte le design system. Pas d'import de librairies UI externes.
```

### ✅ Validation avant de passer à l'Étape 7

**Toi, tu vérifies** :
- [ ] La nav s'affiche sur toutes les pages
- [ ] Le footer s'affiche sur toutes les pages
- [ ] Les liens de nav fonctionnent (tu peux naviguer entre les routes)
- [ ] La version mobile affiche le hamburger (redimensionne le navigateur)
- [ ] Les traductions FR/EN fonctionnent sur la nav et le footer

---

## ÉTAPE 7 — Landing page

### 🙋 Ce que TU fais

**Rien directement.** C'est la plus grosse étape visuellement — prends le temps de bien valider à la fin.

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 7 : Construction de la landing page

🎨 UTILISE LE SKILL `frontend-design` POUR CETTE TÂCHE.

Objectif : reproduire fidèlement docs/landing-mockup.html en React,
tout en utilisant les composants UI créés à l'Étape 5 et en passant
toutes les strings par i18next.

Crée les composants suivants dans src/components/landing/ :

1. Hero.tsx
   - Grid 2 colonnes (texte 1.2fr, visuel 1fr)
   - Fond: gradient navy-600 → navy-800
   - Effet radial orange glow en arrière-plan
   - Eyebrow orange "Audit IA automatisé · Conçu au Québec"
   - Titre h1 avec "IA" en orange
   - Sous-titre 18px muted
   - Deux CTA (primary + ghost-dark)
   - Stats row en bas (10 min / 3-5 / 20+)

2. AuditCard.tsx (dans src/components/audit/, pas landing/)
   - Card blanche rotation -1deg au repos, 0deg au hover
   - Header: label "Audit en cours" + nom client + status badge animé
   - Liste de 5 étapes avec StepIndicator (état calculé via props)
   - ProgressBar en bas
   - Props: clientName, steps (array avec state), progressValue

3. Trust.tsx
   - Bande cream étroite
   - Label uppercase gauche
   - 4 points de confiance avec ✓ orange

4. Problem.tsx
   - 3 cartes en grille
   - Numéros 01 02 03 en font-mono orange
   - Titres navy-600 bold
   - Description en muted

5. How.tsx
   - Grid 2 colonnes
   - Timeline verticale gauche (3 étapes, #2 "current" en orange)
   - Sample de rapport droite (card avec 2 opportunités mockées)

6. Pricing.tsx
   - 3 tiers (A / B / C)
   - Tier B featured (navy-600, border orange, scale-[1.03], badge
     "Le plus choisi")
   - Features avec flèche orange →

7. FinalCTA.tsx
   - Fond navy-800 avec glow orange
   - Titre avec accent orange
   - Bouton orange large

Puis assemble tous ces composants dans src/pages/Landing.tsx dans l'ordre :
Hero → Trust → Problem → How → Pricing → FinalCTA.

Ajoute toutes les traductions FR et EN dans src/locales/fr/landing.json
et src/locales/en/landing.json. Toutes les strings doivent passer par
useTranslation('landing').

Critères de qualité :
- Responsive: tout passe en une colonne sous 900px
- Animations fluides (fade-in au scroll, hover states)
- Typographie respecte l'échelle du design system
- Aucun hardcodé de texte, tout via i18next

Quand tout est prêt, lance npm run dev et dis-moi de comparer avec le
mockup docs/landing-mockup.html pour identifier les différences.
```

### ✅ Validation avant de passer à l'Étape 8

**Toi, tu fais un comparatif visuel** :

1. Ouvre le mockup `docs/landing-mockup.html` dans un onglet (par double-clic sur le fichier)
2. Ouvre http://localhost:5173 dans un autre onglet
3. Compare section par section :
   - [ ] Hero (couleurs, typo, stats, audit card rotation)
   - [ ] Trust (points de confiance)
   - [ ] Problem (3 cartes, numéros orange)
   - [ ] How (timeline + sample rapport)
   - [ ] Pricing (3 tiers, B featured)
   - [ ] FinalCTA (glow orange)

**Si tu vois des différences**, dis précisément à Claude Code :
> « Sur la section X, j'observe Y. Le mockup montre Z. Aligne sur le mockup. »

---

## ÉTAPE 8 — Authentification Supabase

### 🙋 Ce que TU fais

**1. Configure les paramètres Auth dans Supabase**

- Va dans ton projet Supabase → Authentication → Providers
- Assure-toi que **Email** est activé
- Décoche « Confirm email » pour le MVP (activable plus tard pour production)

**2. Ajoute un trigger SQL pour créer automatiquement un profil client**

Dans Supabase SQL Editor, exécute :

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.clients (auth_user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Ce trigger fait qu'à chaque signup, une ligne correspondante est créée dans la table `clients`.

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 8 : Authentification Supabase (MVP minimal)

🎨 UTILISE LE SKILL `frontend-design` POUR LES PAGES UI.

1. Crée src/lib/AuthContext.tsx :
   - Context React qui écoute supabase.auth.onAuthStateChange()
   - Expose user, loading, signIn, signUp, signOut
   - Fournit un AuthProvider à wrapper autour de l'app

2. Crée src/hooks/useAuth.ts qui retourne le context.

3. Modifie src/main.tsx pour wrapper l'app dans <AuthProvider>.

4. Crée src/pages/Login.tsx :
   - Container centré, max-w-md, card blanche
   - Titre "Connexion" (via i18n)
   - Input email (type=email, required)
   - Input password (type=password, required)
   - Bouton primary "Se connecter"
   - Lien vers /signup "Pas encore de compte ?"
   - Gestion d'erreur visible (Alert component ou équivalent)
   - Redirection vers /dashboard après succès

5. Crée src/pages/Signup.tsx :
   - Même structure que Login
   - Champs: email, password, nom complet, langue préférée (FR/EN)
   - Validation: password min 8 caractères
   - Redirection vers /dashboard après succès

6. Crée src/components/layout/ProtectedRoute.tsx :
   - Vérifie useAuth().user
   - Si null, redirige vers /login
   - Si loading, affiche un spinner
   - Sinon, affiche <Outlet />

7. Dans src/App.tsx, wrappe les routes authentifiées dans ProtectedRoute :
   /dashboard, /admin, /audit/:id/processing, /audit/:id/report

8. Crée un src/pages/Dashboard.tsx placeholder qui affiche :
   - "Bonjour {user.email}"
   - Bouton "Se déconnecter"
   - Placeholder "Vos audits apparaîtront ici"

9. Ajoute les traductions dans src/locales/{fr,en}/common.json (section auth).

Demande-moi de tester :
- Créer un compte via /signup
- Vérifier que je suis redirigé vers /dashboard
- Vérifier que la table clients dans Supabase a une nouvelle ligne
- Me déconnecter
- Me reconnecter via /login

Respecte le design system. Les pages auth doivent être soignées,
pas des formulaires bruts.
```

### ✅ Validation avant de passer à l'Étape 9

**Toi, tu testes le flux complet** :

1. Va sur http://localhost:5173/signup
2. Crée un compte test (exemple : `test@pennyaudit.com`)
3. Tu dois être redirigé vers `/dashboard`
4. Va dans Supabase → Table Editor → `clients` : une nouvelle ligne doit apparaître
5. Clique « Se déconnecter »
6. Tu dois être renvoyé vers `/login` ou `/`
7. Essaie d'accéder à `/dashboard` sans être connecté : tu dois être redirigé vers `/login`
8. Reconnecte-toi avec les mêmes identifiants

---

## ÉTAPE 9 — Préparer et lancer le seed des patterns

### 🙋 Ce que TU fais

**1. Copie le script seed-patterns.js dans ton projet**

Si tu ne l'as pas déjà fait, copie le fichier `seed-patterns.js` (fourni en début de session) dans le dossier `scripts/` de ton projet. Crée le dossier `scripts/` si nécessaire.

**2. Vérifie que les 5 patterns YAML sont dans `patterns/`**

Tu dois avoir :
- `patterns/pattern-001-receptionniste-ia-vocale-v2.yaml`
- `patterns/pattern-002-chatbot-textuel-multicanal-v2.yaml`
- `patterns/pattern-003-prise-rendez-vous-automatisee.yaml`
- `patterns/pattern-004-redaction-contenu-marketing.yaml`
- `patterns/pattern-005-gestion-courriels-ia.yaml`

**3. Ajoute les 2 clés manquantes dans `.env`** :

```
VOYAGE_API_KEY=pa-xxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
```

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 9 : Préparation du seed des patterns

1. Ouvre scripts/seed-patterns.js et vérifie qu'il est bien présent.
   Si non, signale-le-moi.

2. Modifie package.json pour ajouter dans la section "scripts" :

   "seed:patterns": "node scripts/seed-patterns.js"

3. Vérifie que package.json a bien "type": "module" (requis car le
   script utilise la syntaxe import/export). Si non, ajoute-le.

4. Vérifie que le script utilise les bonnes variables d'environnement
   (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY). Si les
   noms sont différents, aligne-les sur mon fichier .env.

5. Vérifie que le modèle d'embedding utilisé est voyage-3 (1024 dims)
   et NON voyage-3-large (qui a d'autres dimensions).

6. Valide que les 5 fichiers YAML sont bien dans patterns/ (ls patterns/).

7. Ne lance PAS encore le script. Je vais le faire manuellement après
   ton rapport.
```

**Après que Claude Code a validé**, **toi, tu lances le seed** :

Dans le terminal VS Code :

```bash
npm run seed:patterns
```

Tu devrais voir des logs comme :

```
📁 5 fichiers YAML trouvés
✅ 5 patterns valides
[1/5] 🔄 ai-voice-receptionist
[1/5]   → Génération embedding
[1/5]   ✅ Inséré : Réceptionniste IA vocale 24/7
...
✅ Succès : 5
```

### ✅ Validation avant de passer à l'Étape 10

**Toi, tu vérifies dans Supabase** :

- Va dans SQL Editor
- Exécute :

```sql
SELECT id, title_fr, vector_dims(embedding) as dims
FROM patterns
ORDER BY id;
```

Tu dois voir :
- 5 lignes
- Chaque ligne a un `id` (ex: `ai-voice-receptionist`)
- Chaque ligne a un `title_fr` (ex: « Réceptionniste IA vocale 24/7 »)
- `dims = 1024` pour toutes les lignes

Si `dims` est différent ou que certains `embedding` sont NULL, demande à Claude Code de déboguer le script.

---

## ÉTAPE 10 — Tester la recherche vectorielle

### 🙋 Ce que TU fais

**Rien directement.** Tu testeras à la fin.

### 🤖 Ce que TU demandes à Claude Code

**Copie-colle ce prompt** :

```
ÉTAPE 10 : Implémentation et test de la recherche vectorielle

Cette étape nécessite une serverless function car on ne peut pas appeler
Voyage AI depuis le frontend (ça exposerait la clé API).

1. Crée le dossier api/ à la racine du projet (pour Vercel serverless).

2. Crée api/embed.ts :
   - Endpoint POST qui reçoit { query: string }
   - Utilise VOYAGE_API_KEY (env var côté serveur)
   - Appelle voyage.embed() avec model='voyage-3', inputType='query'
   - Retourne { embedding: number[] }
   - Gère les erreurs avec status codes appropriés

3. Crée src/lib/patterns.ts avec une fonction searchPatterns :
   - Appelle /api/embed pour obtenir l'embedding de la query
   - Appelle supabase.rpc('match_patterns', { query_embedding, ... })
   - Retourne les patterns classés par similarité
   - Options: industry filter, size filter, limit, threshold

4. Crée src/pages/TestSearch.tsx :
   - Input textarea pour saisir une requête en langage naturel
   - Bouton "Rechercher"
   - Affiche les résultats sous forme de cards avec :
     - Title
     - Category
     - Score de similarité (en %)
     - Raw JSON du content (en <details> rétractable)
   - Loading state pendant la recherche
   - Messages d'erreur clairs

5. Ajoute la route /test-search dans App.tsx.

6. Configure Vercel pour le développement local avec vercel CLI :
   - npm install -g vercel (si pas déjà installé globalement)
   - vercel dev (pour tester les serverless functions en local)
   
   OU alternativement, crée un serveur Express local minimal dans
   scripts/dev-server.js pour exposer /api/embed pendant le développement.

7. Demande-moi de tester avec 3 requêtes :
   - "Je suis plombier et je rate trop d'appels"
     → devrait retourner #001 (réceptionniste vocale) en premier
   - "Je passe mes soirées à répondre aux courriels"
     → devrait retourner #005 (gestion courriels) en premier
   - "Je veux publier du contenu sur Instagram"
     → devrait retourner #004 (rédaction marketing) en premier

Si les résultats ne sont pas cohérents, je reviendrai vers toi pour
améliorer le embedding_source des patterns.
```

### ✅ Validation finale de la Phase 3

**Toi, tu testes** :

1. Va sur http://localhost:5173/test-search (après avoir lancé le bon serveur)
2. Fais les 3 tests de requêtes ci-dessus
3. Les résultats doivent correspondre aux attentes
4. Score de similarité doit être > 50% pour le top result de chaque requête

**Si les résultats sont cohérents** : 🎉 Tu as terminé la Phase 3. Bravo.

**Si les résultats sont incohérents** : note ce qui ne va pas et reviens me voir en nouvelle session Claude pour qu'on améliore les embeddings.

---

## Checklist finale de la Phase 3

Quand tu as complété les 10 étapes, tu devrais avoir :

- [ ] Projet Vite + React 19 + TypeScript fonctionnel
- [ ] Tailwind CSS v4 configuré avec les tokens 5PennyAi
- [ ] Supabase connecté (`/test-supabase` retourne des données)
- [ ] 2 Storage Buckets créés (audit-reports, audit-assets)
- [ ] i18next opérationnel avec FR/EN (switcher fonctionne)
- [ ] 6 composants UI créés et testés (`/components-demo`)
- [ ] Layout global (Nav, Footer, Container) implémenté
- [ ] 8 routes configurées avec React Router
- [ ] Landing page complète (`/`) qui matche le mockup
- [ ] Auth Supabase minimal (signup, login, protected routes)
- [ ] 5 patterns seedés dans Supabase avec embeddings 1024D
- [ ] Recherche vectorielle testée avec 3 requêtes cohérentes

**Temps total estimé** : 6-10 heures réparties sur 2-3 soirées.

Commite régulièrement avec des messages clairs :
```bash
git add .
git commit -m "Étape X complétée: [description]"
```

---

## Ce qui vient après la Phase 3

Quand tu as validé la checklist ci-dessus, reviens dans Claude.ai (pas Claude Code) pour la **Session 2** où on attaquera :

1. Le formulaire d'intake multi-étapes (15 questions)
2. Le pipeline des 5 skills (prompts détaillés + orchestration)
3. L'écran de progression (l'AuditCard devient réel, pas un mockup)
4. Le workflow de revue humaine (repositionnement 48h — voir décision 22 avril 2026)

---

## Problèmes fréquents et solutions

**Tailwind v4 ne charge pas les couleurs custom**
→ Vérifie que `src/styles/index.css` est bien importé dans `src/main.tsx` et que la syntaxe `@theme` est correcte. Tailwind v4 utilise `@theme` au lieu de `tailwind.config.js`.

**"Missing SUPABASE_URL" au lancement**
→ Ton `.env` n'est pas lu. Vérifie qu'il est à la racine, que les variables commencent par `VITE_` pour celles qui sont côté client. Relance `npm run dev`.

**Le seed échoue avec "vector dimension mismatch"**
→ Tu as oublié d'exécuter `ALTER TABLE patterns ALTER COLUMN embedding TYPE VECTOR(1024);` dans Supabase. Fais-le et relance le seed.

**La recherche vectorielle retourne 0 résultats**
→ Vérifie que `match_threshold` n'est pas trop haut. Essaie avec 0.3 pour débugger. Si ça retourne toujours rien, vérifie que les embeddings sont bien non-NULL dans la table patterns.

**Claude Code me crée des composants avec des styles génériques**
→ Tu as oublié de lui demander d'utiliser le skill `frontend-design`. Ajoute cette mention dans ton prompt et relance la tâche.

**i18n ne change pas la langue**
→ Vérifie que `import './lib/i18n'` est bien AVANT le render dans `main.tsx`. Si oui, vérifie que les fichiers de traduction sont bien chargés dans `resources` de la config.

---

*Instructions v2.0 — Séparation claire TOI / Claude Code*
*Réécrit le 22 avril 2026 suite au feedback utilisateur*
