# Design System — Outil d'audit IA 5PennyAi

> **Usage** : Document de référence pour Claude Code. Contient toutes
> les décisions visuelles (couleurs, typographie, composants, tokens)
> à respecter lors du développement de l'app React.
>
> Stack cible : React 19 + Vite + Tailwind CSS v4 + react-i18next

---

## 1. Palette de couleurs (tokens Tailwind v4)

### Palette principale

```css
/* À mettre dans src/index.css avec Tailwind v4 */
@theme {
  /* Bleu marine — couleur dominante */
  --color-navy-50:  #E3E8EE;
  --color-navy-100: #C2CCD8;
  --color-navy-200: #95A5B7;
  --color-navy-300: #687E96;
  --color-navy-400: #3B5775;
  --color-navy-500: #1B3A5F;  /* Navy soft */
  --color-navy-600: #0F2744;  /* PRINCIPAL - navy brand */
  --color-navy-700: #0B1E36;
  --color-navy-800: #081A30;  /* Navy deep */
  --color-navy-900: #050F1C;

  /* Orange — couleur d'accent */
  --color-orange-50:  #FDE8D0;  /* Background soft */
  --color-orange-100: #FAD2A1;
  --color-orange-200: #F7BB72;
  --color-orange-300: #F7A14A;
  --color-orange-400: #F68C33;
  --color-orange-500: #F57D20;  /* PRINCIPAL - orange brand */
  --color-orange-600: #D8631A;  /* Orange hover */
  --color-orange-700: #A94E14;
  --color-orange-800: #7B380E;
  --color-orange-900: #4F2308;

  /* Neutres */
  --color-cream: #FBF7F0;      /* Fond chaleureux alternatif */
  --color-paper: #FBFBFB;       /* Fond clair par défaut */
  --color-line: #E3E8EE;        /* Bordures discrètes */
  --color-muted: #5B6B7E;       /* Texte secondaire */

  /* Sémantiques */
  --color-success: #10B981;
  --color-success-bg: #D1FAE5;
  --color-warning: #F59E0B;
  --color-warning-bg: #FEF3C7;
  --color-danger: #EF4444;
  --color-danger-bg: #FEE2E2;

  /* Typographie */
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

### Règles d'utilisation

**Navy 600 (`#0F2744`)** : couleur dominante. Headers, nav, CTA finaux, titres.

**Orange 500 (`#F57D20`)** : couleur d'accent. Boutons primaires, badges, numéros d'étapes, éléments actifs, accents typographiques dans les titres.

**Orange 600 (`#D8631A`)** : état hover des boutons orange.

**Cream (`#FBF7F0`)** : fond alternatif chaleureux pour sections claires (comment ça marche, rangée de confiance).

**Navy 800 (`#081A30`)** : sections sombres avec plus de contraste (CTA final, pieds de page).

**Muted (`#5B6B7E`)** : texte secondaire, descriptions, labels.

### Règle d'or de la couleur
- Le bleu marine est le **monsieur sérieux** de la marque
- L'orange est la **poignée de main chaleureuse**
- Pas plus de 15% d'orange sur une page — si tu vois trop d'orange, quelque chose cloche
- Le navy doit toujours avoir au moins 4.5:1 de contraste avec son background

---

## 2. Typographie

### Polices

```html
<!-- À mettre dans index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Échelle typographique

| Token | Usage | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| `text-hero` | H1 hero landing | `clamp(42px, 5.2vw, 68px)` | 700 | 1.05 | -0.03em |
| `text-section` | H2 sections | `clamp(36px, 4vw, 52px)` | 700 | 1.1 | -0.025em |
| `text-h3` | H3 cartes | 22-26px | 700 | 1.25 | -0.01em |
| `text-body-lg` | Paragraphes mis en valeur | 18px | 400 | 1.6 | 0 |
| `text-body` | Paragraphes standards | 15-16px | 400 | 1.6 | 0 |
| `text-small` | Labels, métadonnées | 13-14px | 500 | 1.5 | 0 |
| `text-micro` | Pills, uppercase | 10-11px | 600 | 1.4 | 0.08-0.1em |

### Règles typographiques

- **Titres** : toujours Plus Jakarta Sans 700, letter-spacing négatif
- **Accents dans les titres** : utiliser `<span class="text-orange-500">mot</span>` — jamais d'italique
- **Code, nombres, labels** : JetBrains Mono pour le côté technique/précis
- **Pas de texte justifié** (aligné à gauche toujours)
- **Pas plus de 60-65 caractères par ligne** pour les paragraphes longs

---

## 3. Composants — spécifications

### Button

Trois variants, deux tailles.

**Variants** :
- `primary` : fond orange, texte blanc. CTA principal. Un seul par section.
- `ghost` : fond transparent, bordure line, texte navy. CTA secondaire.
- `ghost-dark` : sur fond sombre. Texte blanc, bordure blanc/30%.

**Tailles** :
- `md` : padding `10px 20px`, texte 14px. Usage courant.
- `lg` : padding `14px 24px`, texte 15px. CTA hero.

**États** :
- Hover : `translateY(-1px)` + `box-shadow` douce
- Focus : ring orange-500/40 de 3px
- Disabled : opacity 0.4, cursor not-allowed

**Border-radius** : `8px` (cohérent avec ton site actuel)

### Card

**Variants** :
- `default` : fond blanc, bordure line, `rounded-2xl` (16px), `p-9` (36px)
- `cream` : fond cream, bordure line, même dimensions
- `featured` : fond navy-600, texte blanc, bordure orange-500, scale 1.03

**Hover** : `translateY(-4px)` + shadow douce.

### Badge / Pill

- `rounded-full`
- Padding : `px-3 py-1.5`
- Font-size : 11px, weight 600
- Font-family : mono pour badges "système", sans pour badges marketing

**Variants** :
- `eyebrow` : orange-500 sur orange-50, avec point animé à gauche
- `tag-primary` : blanc sur orange-500 (pour "Quick win", "Recommandé")
- `tag-secondary` : blanc sur navy-600
- `status-success` : vert sur green-bg

### Input (formulaire)

- Height : `44px` (grande cible tactile)
- Padding : `px-4`
- Border : 1.5px line (2px au focus, orange-500)
- Border-radius : `8px`
- Font-size : 16px (évite zoom mobile iOS)
- Background : blanc
- Placeholder : muted

### Progress bar (étapes d'audit)

- Hauteur : `6px`
- Fond : line
- Fill : gradient linéaire orange-500 → orange-600
- Border-radius : `6px`
- Animation fluide au changement de valeur

### Step indicator (liste d'étapes audit)

Circle de 26px × 26px avec 3 états :
- **Pending** : fond cream, bordure line, numéro en muted
- **Active** : fond orange-500, numéro blanc, ring orange-500/20 de 4px, point pulsant
- **Done** : fond navy-600, coche blanche, bordure navy-600

---

## 4. Espacement

### Système de spacing (Tailwind par défaut, bien utiliser)

| Token | Valeur | Usage |
|---|---|---|
| `gap-2` / `p-2` | 8px | Éléments très rapprochés |
| `gap-3` / `p-3` | 12px | Espacement compact |
| `gap-4` / `p-4` | 16px | Standard |
| `gap-6` / `p-6` | 24px | Séparation d'éléments |
| `gap-8` / `p-8` | 32px | Espacement généreux |
| `p-9` | 36px | Padding de card standard |
| `gap-12` / `p-12` | 48px | Séparation de sections |
| `gap-20` / `py-20` | 80px | Padding sections sur mobile |
| `py-24` | 96px | Padding sections sur desktop |
| `py-32` | 128px | Hero padding |

### Container

- Max-width : `1280px`
- Padding horizontal : `32px` desktop, `16-24px` mobile
- Centré : `mx-auto`

### Grilles

- **Hero** : `1.2fr 1fr` avec gap `80px`
- **Cards 3-col** : `grid-cols-3` avec gap `24px`
- **Section avec sidebar** : `1fr 1fr` avec gap `80px`
- **Mobile** : tout passe en `grid-cols-1` sous 900px

---

## 5. Ombres et effets

```css
/* À ajouter au @theme Tailwind */
--shadow-card: 0 4px 12px -4px rgba(15, 39, 68, 0.08);
--shadow-card-hover: 0 20px 40px -15px rgba(15, 39, 68, 0.12);
--shadow-featured: 0 30px 60px -20px rgba(15, 39, 68, 0.4), 0 0 0 2px var(--color-orange-500);
--shadow-orange-glow: 0 6px 16px -4px rgba(245, 125, 32, 0.4);
```

### Règles
- **Pas d'ombres agressives** — toujours semi-transparentes dans la teinte navy
- Cards au repos : `shadow-card`
- Cards au hover : `shadow-card-hover`
- CTA orange hover : `shadow-orange-glow`
- **Pas d'ombres sur mobile** (économie de performance)

---

## 6. Animations et transitions

### Transitions standards

```css
transition: all 0.15s ease; /* Hover boutons */
transition: all 0.2s ease;  /* Hover cards */
transition: all 0.3s ease;  /* Transitions plus marquées */
```

### Animations utiles

**Pulse (badges actifs, points live)** :
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
animation: pulse 1.5s infinite;
```

**Progress bar (audit en cours)** :
```css
@keyframes progress {
  0% { width: 40%; }
  50% { width: 65%; }
  100% { width: 40%; }
}
```

**Règle générale** : aucune animation qui distrait. Les animations servent à
montrer l'état du système, pas à impressionner.

---

## 7. Tokens i18next (structure FR/EN)

```
src/locales/
├── fr/
│   ├── common.json       # Boutons, labels génériques
│   ├── landing.json      # Page d'accueil
│   ├── intake.json       # Formulaire d'audit
│   ├── report.json       # Rapport d'audit
│   ├── dashboard.json    # Espace client
│   └── errors.json
└── en/
    ├── common.json
    ├── landing.json
    ├── intake.json
    ├── report.json
    ├── dashboard.json
    └── errors.json
```

### Exemple `common.json`

```json
{
  "nav": {
    "why": "Pourquoi",
    "how": "Comment ça marche",
    "pricing": "Tarifs",
    "examples": "Exemples",
    "startAudit": "Lancer un audit"
  },
  "cta": {
    "startAudit": "Commencer mon audit",
    "viewExample": "Voir un exemple",
    "learnMore": "En savoir plus",
    "continue": "Continuer",
    "back": "Retour"
  },
  "status": {
    "processing": "Traitement",
    "completed": "Terminé",
    "pending": "En attente"
  }
}
```

### Règles i18next
- **Jamais de texte en dur** dans les composants
- Toutes les chaînes passent par `t('namespace.key')`
- Pluriels et variables : utiliser `{{count}}`, `{{name}}`, etc.
- Les clés sont en anglais (pour développement), les valeurs varient par langue

---

## 8. Structure des composants React

```
src/
├── components/
│   ├── layout/
│   │   ├── Nav.tsx           # Navigation avec logo + lang switch
│   │   ├── Footer.tsx
│   │   └── Container.tsx     # Wrapper avec max-width
│   ├── ui/
│   │   ├── Button.tsx        # Variants: primary, ghost, ghost-dark
│   │   ├── Card.tsx          # Variants: default, cream, featured
│   │   ├── Badge.tsx         # Variants: eyebrow, tag, status
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── Checkbox.tsx
│   │   ├── ProgressBar.tsx
│   │   └── StepIndicator.tsx
│   ├── audit/
│   │   ├── AuditCard.tsx     # Le card d'audit en cours (hero)
│   │   ├── AuditStep.tsx     # Une étape individuelle
│   │   └── AuditProgress.tsx # Progression globale
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── Trust.tsx
│   │   ├── Problem.tsx
│   │   ├── How.tsx
│   │   ├── Pricing.tsx
│   │   └── FinalCTA.tsx
│   ├── intake/
│   │   ├── IntakeForm.tsx
│   │   └── questions/        # Un composant par type de question
│   └── report/
│       ├── ReportLayout.tsx
│       ├── OpportunityCard.tsx
│       └── RoadmapTimeline.tsx
├── pages/                    # Routes React Router
├── locales/                  # Traductions
├── lib/
│   ├── supabase.ts          # Client Supabase
│   ├── anthropic.ts         # Wrapper API Anthropic
│   └── utils.ts
└── styles/
    └── index.css             # Tailwind v4 + tokens
```

---

## 9. Règles d'accessibilité non négociables

- **Contraste texte** : min 4.5:1 (WCAG AA) pour tous les textes
- **Navigation clavier** : tous les éléments interactifs accessibles au clavier
- **Focus visible** : ring orange-500/40 de 3px sur tous les éléments focusables
- **Labels de formulaire** : toujours associés à leur input (`<label htmlFor>`)
- **Alt-text sur images** : toutes les images porteuses d'information
- **Hiérarchie de titres** : H1 → H2 → H3 (pas de saut)
- **Lang attribute** : mis à jour dynamiquement selon i18next (`fr` ou `en`)

---

## 10. Règles de contenu rédactionnel

**Ton de voix** :
- Direct et honnête, pas marketing creux
- Pas de « transformez », « révolutionnez », « débloquez »
- Utiliser des chiffres concrets (« 10 minutes », « 149 $ »)
- Tutoiement dans les éléments de l'interface, vouvoiement dans les communications clients
- Français québécois : « courriel » (pas « email »), « téléverser » (pas « uploader »)

**Mots à privilégier** : audit, rapport, opportunités, contexte, concret,
adapté, honnête, transparent, accompagnement, méthode.

**Mots à éviter** : solution (trop vague), révolutionnaire, innovant,
disruptif, unleash, unlock, transform.

---

## 11. Checklist de révision visuelle

Avant de considérer qu'un écran est « fini », vérifier :

- [ ] Le navy (`#0F2744`) est utilisé comme couleur dominante de l'écran
- [ ] L'orange (`#F57D20`) apparaît au moins une fois comme accent, jamais plus de 15% de la surface
- [ ] La typographie suit l'échelle définie
- [ ] Les espacements utilisent les tokens (pas de `p-[23px]` custom)
- [ ] Les boutons ont des états hover, focus, disabled
- [ ] Le contraste passe le test WCAG AA (utiliser l'extension WebAIM)
- [ ] L'écran fonctionne en FR et en EN (tester avec `i18n.changeLanguage`)
- [ ] Le responsive est propre (test à 375px, 768px, 1024px, 1440px)
- [ ] Les animations sont présentes mais discrètes
- [ ] Les états vides (« pas encore d'audits ») ont été conçus

---

## 12. Exemples de prompts pour Claude Code

Quand tu demandes à Claude Code de créer un composant, donne-lui toujours
ce contexte en une phrase :

> "Respecte le design system de 5PennyAi : navy-600 comme couleur
> dominante, orange-500 comme accent, Plus Jakarta Sans pour le texte,
> JetBrains Mono pour les éléments techniques. Le fichier
> DESIGN_SYSTEM.md dans le projet contient toutes les spécifications."

Ensuite, décris simplement le composant avec ses fonctionnalités. Claude
Code saura comment le styler.

---

*Design system v1.0 — Basé sur l'identité visuelle de 5pennyai.com*
*À maintenir à jour quand des décisions visuelles sont prises*
