# Instructions permanentes pour Claude Code

## Contexte du projet

Application web d'audit IA automatisé pour 5PennyAi. Les clients
remplissent un formulaire sur leur entreprise, l'app exécute un pipeline
de 5 skills IA (Claude API), et génère un rapport personnalisé PDF/DOCX.

## Stack technique

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- Anthropic API (Claude Sonnet 4.5)
- Voyage AI pour les embeddings
- Vercel serverless functions
- react-i18next (FR/EN bilingue)
- Stripe pour paiements

## Documents de référence

AVANT d'écrire du code, consulte systématiquement :

1. **docs/DESIGN_SYSTEM.md** — Tokens couleurs, typographie, composants.
   Tout ce que tu construis doit respecter ce design system.

2. **docs/CONTEXT_PROJET.md** — Contexte stratégique et décisions prises.
   Lis-le si tu ne comprends pas une décision de design ou d'architecture.

3. **docs/landing-mockup.html** — Mockup de référence pour la landing page.
   Utilise-le comme source de vérité visuelle.

## Utilisation obligatoire du skill frontend-design

Pour TOUTE création de composant UI, page, interface visuelle :
**utilise systématiquement le skill `frontend-design`** de Claude Code
avant d'écrire quoi que ce soit.

Ce skill te guide pour produire du code frontend distinctif et de qualité
production, qui évite les aesthétiques génériques AI. Il t'aide à faire
des choix intentionnels (typographie, couleurs, espacement, motion,
composition) plutôt que de tomber dans les patterns par défaut.

Déclenche ce skill à CHAQUE fois que la tâche implique :
- Créer un composant React avec du style
- Construire une page ou une vue
- Implémenter un formulaire
- Styler quoi que ce soit avec Tailwind
- Concevoir une interaction ou une animation

## Règles de design à respecter absolument

- **Couleur dominante** : navy-600 (#0F2744)
- **Couleur d'accent** : orange-500 (#F57D20), maximum 15% de la surface
- **Typographie** : Plus Jakarta Sans pour texte, JetBrains Mono pour éléments techniques
- **Border-radius** : 8px (boutons, inputs) / 16px (cards)
- **Animations** : présentes mais discrètes, jamais distrayantes
- **Bilinguisme** : toute string passe par useTranslation() i18next, jamais de texte en dur

## Règles de code à respecter

- TypeScript strict mode activé
- Composants fonctionnels avec hooks (pas de classes)
- Props interfaces nommées explicitement (ex: `ButtonProps`)
- Tailwind utility classes (pas de CSS modules sauf exceptions)
- Utiliser `cn()` de clsx + tailwind-merge pour composer les classes
- Respecter la structure `/src/components/{layout,ui,audit,landing,intake,report}/`

## Ton

L'utilisateur s'appelle Christian. Parle-lui en français. Sois direct et
concret. Ne lui propose pas 3 options quand une seule est clairement la
bonne. Explique tes décisions techniques quand elles sont non-évidentes.