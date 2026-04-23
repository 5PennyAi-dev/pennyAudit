# Contexte du projet — Outil d'audit IA 5PennyAi

> **But de ce document** : permettre à une nouvelle session de conversation
> de reprendre le projet sans perdre le contexte. À charger au début de
> chaque nouvelle session de travail sur ce projet.

---

## 1. Vue d'ensemble du projet

### Qu'est-ce qu'on construit

Un **outil d'audit IA automatisé en self-serve** pour le site 5PennyAi
(5pennyai.com). L'outil permet à un propriétaire de micro-entreprise ou de
PME de remplir un formulaire en ligne et de recevoir un rapport d'audit
personnalisé qui identifie :
- 3-5 opportunités d'intégration de l'IA adaptées à son contexte
- Les outils recommandés pour chaque opportunité
- L'effort et le coût estimés
- Les risques et prérequis
- Une roadmap priorisée

Le rapport est livré en PDF/DOCX, personnalisé, avec option d'annexe de
sources vérifiées.

### Pourquoi cet outil

Christian (fondateur de 5PennyAi) a une double problématique :
1. **Il veut éviter le consulting traditionnel** — inconfort avec le rôle
   de "consultant senior qui fait des audits à la main", syndrome de
   l'imposteur sur la partie "parler d'affaires"
2. **Il veut un produit scalable** — un outil qui travaille pour lui
   pendant qu'il dort, plutôt que de facturer des heures

Cet outil est à la fois :
- **Un produit en soi** (audit payant 99-299 $ self-serve)
- **Un générateur de leads qualifiés** pour les services de 5PennyAi
  (setup accompagné 1 500-3 000 $, développement custom 5 000-15 000 $)

### Positionnement stratégique

- **Marché cible** : micro-entreprises, solopreneurs et PME 10-50 employés
  du Québec (francophones en priorité)
- **Cible initiale** : services à domicile, cliniques, salons, coachs,
  restaurants, consultants, petits commerces
- **Différenciation** : audit automatisé en self-serve que les concurrents
  québécois n'offrent pas (FloatAI, EvoluAI, IT Cares, CyberPerformance,
  Gestisoft, PME AI vendent tous du conseil manuel)
- **Avantage compétitif** : expertise technique démontrable via PennySEO
  (SaaS IA déjà en production), capacité de développement full-stack

---

## 2. Profil de Christian (fondateur/opérateur)

### Expertise technique
- 20+ ans en TI (analyste fonctionnel majoritairement)
- Bacc informatique + bioinformatique + programme en sciences des données
- Certifications Microsoft AI (AI-102, DP-100, PL-300, AI-900)
- Machine Learning Specialization + Generative AI avec LLMs (Coursera)
- A conçu, développé et déployé PennySEO en solo (SaaS IA complet)

### Stack maîtrisée
- **Frontend** : React 19/Vite, Tailwind CSS v4, React Router, react-i18next
- **Backend** : Node.js/Express, Vercel Serverless Functions
- **Base de données** : Supabase (PostgreSQL, Auth, RLS, Edge Functions, pgvector)
- **IA** : Anthropic API (Claude Sonnet 4), Gemini Vision, OpenAI API
- **Outils dev** : Claude Code, VS Code, Git, Vercel CLI
- **Diagrammes** : @excalidraw/excalidraw
- **Forms/booking** : Formspree, Cal.com

### Limites à garder en tête
- Ne connaît pas le monde des affaires/PME de l'intérieur (vient d'un
  background employé/consultant technique)
- A du syndrome de l'imposteur sur les questions "business"
- A mentionné SEAO comme une zone où il n'a pas de vraie expertise
  (y a travaillé mais n'a pas participé à la conception du système)
- Est solo donc ne peut pas prendre beaucoup de clients "haute touch"
- Basé à Sainte-Brigitte-de-Laval, QC

### Préférences établies dans la conversation
- Français pour le MVP (traduction anglaise plus tard via skill de traduction)
- Nomenclature anglaise pour les champs YAML (target_industries, risks, etc.)
- Valeurs et descriptions en français
- Format YAML pur (pas de version MD narrative parallèle)
- **Orientation équilibrée** pour l'audit (ne privilégie ni self-serve ni
  accompagné ni custom — laisse l'outil qualifier honnêtement)

---

## 3. Architecture proposée

### Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (React/Vite sur Vercel)                       │
│  - Formulaire multi-étapes (intake)                     │
│  - Dashboard des audits                                 │
│  - Éditeur de révision section par section              │
│  - Prévisualisation avant export                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATION (Vercel Serverless)                      │
│  - /api/audit/run (orchestre les skills, SSE progress)  │
│  - Appelle les 5 skills en séquence                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│  5 SKILLS SPÉCIALISÉS (chacun = 1 appel Anthropic API)   │
│  Skill 1: Context profile     (structure le contexte)    │
│  Skill 2: Opportunities       (RAG sur patterns library) │
│  Skill 3: Risk analysis       (identifie risques)        │
│  Skill 4: Tech stack audit    (évalue écosystème)        │
│  Skill 5: Synthesis + ROI     (roadmap priorisée)        │
└──────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL + Storage)                        │
│  - Table clients                                        │
│  - Table audits (statut + sections JSON)                │
│  - Table patterns (avec pgvector pour recherche)        │
│  - Table audit_templates (versioning)                   │
│  - Storage pour PDF/DOCX générés                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  EXPORT FINAL                                           │
│  - DOCX via lib `docx` (npm)                            │
│  - Option PDF via conversion ou jsPDF                   │
│  - Livraison par courriel ou download direct            │
└─────────────────────────────────────────────────────────┘
```

### Les 5 skills en détail

**Skill 1 — Context profile**
- Input : données brutes du formulaire d'intake
- Output JSON structuré : secteur, taille, maturité numérique, enjeux
  d'affaires, volumétries, stack actuel, contraintes réglementaires,
  budget disponible, confort technique, préférence voie (self-serve vs
  accompagné vs custom)
- Rôle : normaliser pour les skills suivants

**Skill 2 — Opportunity identifier (skill-clé)**
- Input : profil contextuel (Skill 1) + résultats de recherche vectorielle
  pgvector sur la librairie de patterns
- Output : 3-5 opportunités concrètes personnalisées au contexte client
- Détail : fait un top-K (ex. K=10-15) sur les patterns par similarité
  sémantique, puis Claude sélectionne/adapte les meilleures
- **Qualité du matching dépend de la qualité de la librairie de patterns**
  (notre focus actuel)

**Skill 3 — Risk analyzer**
- Input : contexte (Skill 1) + opportunités sélectionnées (Skill 2) +
  champ `risks` des patterns concernés
- Output : liste priorisée de risques (techniques, réglementaires, humains,
  données) avec sévérité et mitigation

**Skill 4 — Tech stack auditor**
- Input : stack actuel du client (Skill 1) + prérequis techniques des
  patterns (Skill 2)
- Output : compatibilité, intégrations faisables, dépendances à résoudre,
  modernisations requises

**Skill 5 — Synthesis + ROI + roadmap**
- Input : tout ce qui précède
- Output : sommaire exécutif, matrice impact/effort, roadmap 6-12 mois
  avec quick wins séquencés, estimation ROI par opportunité

### Modèle de données Supabase (version simplifiée)

```sql
-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP,
  business_name TEXT,
  industry TEXT,
  size TEXT
);

-- Audits
CREATE TABLE audits (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  status TEXT, -- draft, running, completed, exported
  intake_data JSONB,
  skill_1_output JSONB,
  skill_2_output JSONB,
  skill_3_output JSONB,
  skill_4_output JSONB,
  skill_5_output JSONB,
  final_document_url TEXT,
  created_at TIMESTAMP
);

-- Patterns (avec pgvector)
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,  -- ex: 'ai-voice-receptionist'
  content JSONB,  -- le pattern complet en YAML converti en JSON
  embedding VECTOR(1536),  -- généré depuis summary_long + pain_point
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX ON patterns USING ivfflat (embedding vector_cosine_ops);
```

---

## 4. Stratégie de la librairie de patterns

### Philosophie

Les patterns sont **la matière première** qui garantit la qualité des
audits. Sans patterns solides, le meilleur pipeline produit des audits
génériques. Avec des patterns bien curés, même un pipeline simple produit
des audits crédibles.

**Règle absolue** : toutes les données dans les patterns doivent être
sourcées. Aucune invention. Chaque métrique, chaque cas client, chaque
affirmation doit avoir une URL vérifiable.

### Utilisation des patterns

**Option C choisie** (hybride) :
- Patterns stockés comme documents internes (non montrés tel quel au client)
- Rapport d'audit généré à partir des patterns, personnalisé au client
- **Option d'annexe de sources** dans le livrable client (on peut ou pas
  montrer les URLs sources)
- Notes internes (`internal_notes_fr`) jamais montrées au client

### Format des patterns

**YAML hybride** — structure machine + champs narratifs en prose :
- Champs structurés (tags, listes, prix) pour filtrage précis
- Champs narratifs (summary_long_fr, pain_point_fr, description_fr) pour
  injection directe dans le livrable client

Voir le fichier `pattern-001-receptionniste-ia-vocale-v2.yaml` comme
référence de structure.

### Méthodologie de production établie

1. Christian lance une requête Perplexity (format fourni par Claude)
2. Claude reçoit les résultats, vérifie les URLs et métriques
3. Claude fait des `web_search`/`web_fetch` complémentaires sur les
   outils clés pour avoir les vrais tarifs et cas clients
4. Claude produit le pattern YAML directement
5. Christian révise, demande des ajustements si besoin

**Leçon apprise** : Perplexity est bon pour découvrir les outils et faire
des synthèses sectorielles, mais **peu fiable pour les métriques précises
et les noms de clients** (il hallucine des exemples plausibles pour
rendre sa réponse concrète). Toujours vérifier via `web_fetch` sur les
sources officielles (pages de pricing, case studies vendeurs, rapports
gouvernementaux).

### Sources fiables identifiées

**Sources gouvernementales fiables** :
- SBA Office of Advocacy (USA) — statistiques d'adoption IA
- Statistique Canada — données PME au Canada/Québec
- Rendez-vous santé Québec (gouvernement) — exemple québécois

**Sources vendeurs (fiables pour leurs propres produits)** :
- Avoca AI, AgentZap, Tidio, Cal.com, Calendly, Anthropic, OpenAI
- Leurs pages de pricing et case studies sont vérifiables

**Sources intégrateurs québécois** (à citer avec prudence, contenu
marketing) :
- FloatAI, EvoluAI, IT Cares, CyberPerformance, Gestisoft, PME AI,
  Nexxo, Mink Agency

**À éviter** :
- Articles génériques "Top 10 AI tools" sans sources directes
- Exemples chiffrés sans URL vérifiable (même de Perplexity)

---

## 5. Structure d'un pattern (schéma canonique)

Voir les fichiers de patterns existants pour exemples complets. Structure
principale :

```yaml
# Identité
id: ai-voice-receptionist
title_fr: Réceptionniste IA vocale 24/7
category: service-client-appels
version: 2.0
last_updated: 2026-04-22

# Résumés (prose narrative pour livrable)
summary_short_fr: >
summary_long_fr: |

# Complémentarité avec autres patterns
complementary_patterns:

# Ciblage
target_industries: []
target_business_sizes: []
tech_comfort_required: faible | faible-a-moyen | moyen | eleve

# Problème (voix du client)
pain_point_fr: |
problem_facts: []

# Solution
solution_summary_fr: |
deployment_modes: []
typical_capabilities: []

# VOIES D'IMPLÉMENTATION (coeur du pattern)
implementation_paths:
  - id: self-serve
  - id: accompanied
  - id: custom

# Outils hiérarchisés (Tier 1/2/3)
tools:
  - id:
    tier: 1|2|3
    affiliate_potential: confirme|a-verifier|non-applicable
    used_in_paths: []

# Concurrence locale
quebec_competitors: []
strategic_note_fr: |

# Coûts (résumé trois voies)
cost_summary_cad:

# Valeur documentée
documented_benefits:
customer_cases: []  # avec relevance_for_micro: faible|moyenne|elevee|tres-elevee

# Risques
risks: []

# Prérequis
prerequisites: []

# Sources (référentiel central)
sources: []

# Métadonnées internes (JAMAIS montré au client)
confidence_level: low|medium|high
internal_notes_fr: |

# Embedding (généré automatiquement au seed)
embedding: null
```

---

## 6. Offre 5PennyAi — Structure à 3 voies

Tous les patterns incluent 3 voies d'implémentation avec profils de
client correspondants. Cette structure est le positionnement commercial
de 5PennyAi.

### Voie A — Self-serve (volume élevé, marge par client faible)
- **Client** : solopreneur, micro-entreprise, budget serré, confort tech
- **Offre** : audit IA payant (99-299 $) qui recommande outils et guide setup
- **Livrable** : rapport d'audit automatisé
- **Revenu type** : 100-300 $/client, potentiel 20-50 clients/mois
- **Temps Christian** : quasi nul après production de l'audit
- **Revenus complémentaires** : affiliations sur outils recommandés

### Voie B — Accompagnement hybride (volume moyen, marge moyenne)
- **Client** : PME 5-20 employés, préfère déléguer la configuration
- **Offre** : audit + atelier de configuration 2-4 heures (paramétrage
  SaaS existants, pas de développement)
- **Livrable** : audit + configurations fonctionnelles + formation
- **Revenu type** : 1 500-4 000 $/client, 3-5 clients/mois possibles
- **Temps Christian** : 1-2 jours par client
- **Position** : sweet spot de rentabilité

### Voie C — Développement custom (volume faible, marge élevée)
- **Client** : PME 20-50 employés avec besoins spécifiques, budget 8 000 $+
- **Offre** : AI Sprint 2-6 semaines de développement custom
- **Livrable** : application custom (style PennySEO à plus petite échelle)
- **Revenu type** : 8 000-15 000 $/projet, 1-2 projets/mois max
- **Temps Christian** : 2-6 semaines dédiées

### Point stratégique
L'audit automatisé qualifie honnêtement le client dans la bonne voie.
Christian privilégie l'honnêteté (orientation équilibrée) pour bâtir
la confiance et la durabilité, plutôt que de pousser systématiquement
vers les voies B/C.

---

## 7. Concurrents québécois identifiés

À garder en tête comme benchmark et comme positionnement :

| Nom | URL | Positionnement principal |
|---|---|---|
| FloatAI | floatai.ca | IA PME montréalaises, services à domicile, Loi 25 |
| EvoluAI | evoluai.ca | Chatbots, rédaction, RDV pour PME québécoises |
| IT Cares | itcares.ca | Copilot Microsoft, automatisation Zapier/Make |
| CyberPerformance | cyberperformance.ca | Chatbot sur mesure, intégration Teams |
| Gestisoft | gestisoft.com | Intégrateur Microsoft Dynamics 365 + IA |
| PME AI | pmeai.ca | Conseil et guides IA pour PME québécoises |
| Nexxo | nexxo.tech | Accompagnement transformation IA PME |
| Mink Agency | mink-agency.com | Conseil stratégique + implémentation IA |

**Observation clé** : **aucun** n'offre un audit automatisé en self-serve.
C'est la vraie différenciation de 5PennyAi.

---

## 8. Hiérarchie des outils recommandés

Pour maintenir la cohérence entre les patterns, les outils suivent cette
logique :

### Tier 1 — Outils de référence (accessibles, francophones ou majeurs)
- **Chat/conversation** : Crisp (français natif), Claude, ChatGPT
- **Visuel** : Canva
- **Scheduling** : Cal.com, GOrendezvous (santé QC), HubSpot
- **Vocal** : AgentZap (meilleure doc), Avoca (HVAC établi), My AI Front Desk
- **Email** : Mailchimp, Brevo (alternative française)
- **Automatisation** : Make (moins cher que Zapier), Zapier

### Tier 2 — Spécialistes sectoriels
- Tidio (chat e-commerce), ManyChat (Messenger/Instagram)
- Acuity, Square Appointments, SimplyBook.me (scheduling niche)
- Jasper, Copy.ai, Writesonic (rédaction marketing — à réserver aux équipes
  dédiées, trop cher pour micro-entreprises)

### Tier 3 — Plateformes de développement (voie C)
- **Québec** : Botpress (Montréal), Voiceflow (Toronto)
- **Custom avec API** : Anthropic API, OpenAI API
- **Vocal custom** : Vapi, Retell AI, LiveKit

### Règle de priorisation pour clients québécois francophones
Toujours vérifier en priorité :
1. Existe-t-il un outil **français natif** (Crisp, Brevo, GOrendezvous) ?
2. Si non, existe-t-il un outil avec **bonne interface française** ?
3. L'outil est-il **populaire au Québec** (Cal.com, Claude, ChatGPT, Canva) ?
4. Le programme d'**affiliation** est-il accessible ?

---

## 9. Stratégie d'affiliation (reportée à Phase 2)

**Décision** : Reporter l'inscription aux programmes d'affiliation jusqu'à
avoir 2-3 audits réels réalisés. Raisons :
- Éviter le piège de l'optimisation prématurée
- HubSpot et autres demandent un portfolio, qui se constitue par les audits
- Programmes peuvent s'ajouter rétroactivement (cookies fonctionnent)

**Programmes confirmés disponibles** (à rejoindre en Phase 2) :
- Tidio, HubSpot (Solutions Partners), Zapier, Make, Canva, Mailchimp,
  Brevo, Jasper, Calendly

**Champ `affiliate_potential`** présent dans chaque outil des patterns :
- `confirme` : programme existe et accessible
- `a-verifier` : probable mais non confirmé
- `non-applicable` : pas de programme (Claude, ChatGPT)

---

## 10. État actuel de la librairie

### Patterns complétés (v2 avec 3 voies + tiers outils)

| # | ID | Titre | Statut |
|---|---|---|---|
| 001 | ai-voice-receptionist | Réceptionniste IA vocale 24/7 | ✅ v2 |
| 002 | ai-text-chatbot-multichannel | Chatbot IA textuel multi-canal | ✅ v2 |
| 003 | ai-appointment-scheduling | Prise de rendez-vous automatisée | ✅ v1 (schéma v2) |
| 004 | ai-marketing-content-creation | Rédaction de contenu marketing | ✅ v1 (schéma v2) |
| 005 | ai-email-management | Gestion intelligente des courriels | ✅ v1 (schéma v2) |

### Couverture actuelle (5 patterns = 5 besoins IA universels)
- Gestion demandes entrantes (vocal #1, chat #2, scheduling #3)
- Communications sortantes (contenu marketing #4, courriels #5)

### Découvertes clés à garder en tête pour les patterns suivants
- **Missive est québécois** (Sherbrooke) — à mettre en avant systématiquement
- **Loi 25 est l'angle différenciateur** pour professions réglementées
  (avocats, notaires, comptables, médecins) — aucun concurrent québécois
  ne l'exploite à fond
- **Claude est l'outil IA à privilégier** pour français naturel et
  empathie dans rédaction (vs ChatGPT plus générique)
- **Cal.com + GOrendezvous + Crisp + Missive** = combo québécois/européen
  qui couvre 80 % des besoins avec bonne conformité

### Patterns prévus (à produire quand on reviendra)

**Priorité haute (prochains)** :
- **006** — Génération et gestion de devis/factures (Jobber, ServiceM8, Square)
- **007** — Transcription et résumé de réunions (Fathom, Otter, tl;dv)

**Priorité moyenne** :
- **008** — Automatisation RH et recrutement
- **009** — Analyse de données et tableaux de bord (Copilot Power BI, Gemini Sheets)
- **010** — Recherche et veille automatisée (Perplexity, ChatGPT Search)

**À explorer plus tard** (cas spécialisés par secteur) :
- **011** — Analyse d'images pour e-commerce/immobilier
- **012** — Automatisation n8n/Zapier multi-étapes
- **013** — Traduction et localisation automatisée
- **014** — Comptabilité automatisée (extraction reçus/factures)
- **015** — Transcription médicale/juridique

**Cible finale** : 25-30 patterns solides couvrant ~80% des besoins
micro-entreprises/PME.

---

## 11. Décisions techniques établies

### Format
- **YAML** (pas Markdown) pour les patterns
- Un fichier par pattern : `pattern-NNN-nom-descriptif.yaml`
- Tous les fichiers dans `/patterns/` au seed

### Nomenclature
- Champs YAML en **anglais** (target_industries, risks, tools)
- Valeurs et textes en **français**
- IDs en kebab-case anglais : `ai-voice-receptionist`, `commerce-en-ligne`

### Langue
- **Français seulement** pour le MVP
- Traduction anglaise via skill de traduction en Phase 2 (stack identique,
  juste ajout d'un appel Claude qui traduit chaque champ narratif)

### Versioning
- Version 1.0 = première passe
- Version 2.0 = ajout des `implementation_paths` et des tiers d'outils
- Les patterns #1 et #2 ont été refaits en v2; les patterns #3 et #4 sont
  directement en format v2

---

## 12. Points psychologiques à garder en tête

Christian peut exprimer de l'inconfort émotionnel à divers moments
(syndrome de l'imposteur, peur de la concurrence, sentiment d'être
submergé). Cela ne doit PAS être interprété comme un changement
stratégique mais comme du bruit à nommer et dépasser.

**Pattern observé** : Christian exprime un doute → Claude aide à le
démêler → Christian confirme "continuons". Trois occurrences déjà dans
la conversation.

**Approche validée** :
- Nommer le doute comme inconfort émotionnel vs analyse stratégique
- Continuer sur la trajectoire établie
- Ne pas sur-analyser chaque hésitation

**Message clé à rappeler si besoin** : Christian a des **capacités
techniques rares** (PennySEO en solo), un **marché énorme et sous-servi**,
et une **différenciation claire** (audit automatisé). Les concurrents
québécois ne font que du conseil manuel. Il n'a pas à les battre, il
a à créer une catégorie adjacente.

---

## 13. Comment reprendre une nouvelle session

### Pour le prochain agent/session

1. **Charger ce document de contexte en premier**
2. **Charger les 4 patterns YAML existants** pour voir le format réel :
   - pattern-001-receptionniste-ia-vocale-v2.yaml
   - pattern-002-chatbot-textuel-multicanal-v2.yaml
   - pattern-003-prise-rendez-vous-automatisee.yaml
   - pattern-004-redaction-contenu-marketing.yaml
3. **Demander à Christian** "où on en était" ou "on continue où ?"
4. **Reprendre à la production du prochain pattern** dans la liste
   (la prochaine étape logique est **Pattern #005 — Gestion
   intelligente des courriels**)

### Méthodologie établie pour produire un pattern

1. Claude lance 3-5 `web_search` ciblées pour identifier les outils
   clés (francophones/québécois en priorité, internationaux en complément)
2. Claude fait 1-2 `web_fetch` sur les pages de pricing des outils
   principaux pour avoir les vrais tarifs
3. Claude rédige le pattern YAML directement dans le format établi
4. Le fichier est sauvé dans `/mnt/user-data/outputs/` avec le nom
   `pattern-NNN-nom-descriptif.yaml`
5. Claude présente le pattern à Christian avec un bref résumé des
   décisions clés (hiérarchie outils, outils québécois en avant,
   concurrents identifiés)
6. Christian valide ou demande des ajustements

### Ressource utile
Christian peut lancer des requêtes dans Perplexity si nécessaire, mais
on a établi que c'est **moins fiable** que les recherches directes de
Claude (Perplexity hallucine des exemples plausibles). À utiliser
principalement pour des survols sectoriels généraux, jamais pour des
métriques précises.

---

## 14. Prochaines étapes après les patterns

Une fois la librairie de 25-30 patterns complète :

1. **Schéma Supabase** : ✅ FAIT (supabase-schema.sql prêt à exécuter)
2. **Seed des patterns** : ✅ FAIT (seed-patterns.js prêt à exécuter)
3. **Formulaire d'intake** : React multi-étapes, 15-20 questions max
4. **Pipeline des 5 skills** : Vercel serverless functions
5. **Orchestration** : `/api/audit/run` avec SSE pour progrès en temps réel
6. **Éditeur de révision** : React UI pour ajuster chaque section avant export
7. **Export DOCX/PDF** : via `docx` npm package
8. **Billing Stripe** : pour la monétisation self-serve
9. **Lancement beta** : 5-10 utilisateurs pour valider et itérer
10. **Lancement public** : marketing sur le site 5PennyAi

**Timing cible réaliste** : MVP fonctionnel en 4-6 semaines après
complétion de la librairie de patterns.

## 14bis. État architecture technique

### Documents techniques produits (Session architecture 1)

| Document | Description | Statut |
|---|---|---|
| DESIGN_SYSTEM.md | Tokens couleurs, typo, composants, règles UX | ✅ |
| supabase-schema.sql | Schéma DB complet avec pgvector | ✅ |
| seed-patterns.js | Script Node.js pour seeder les patterns | ✅ |
| CLAUDE_CODE_INSTRUCTIONS.md | Instructions pas-à-pas pour Claude Code (10 étapes) | ✅ |
| landing-5pennyai-brand.html | Mockup landing aligné sur identité 5PennyAi | ✅ |

### Décisions techniques importantes

- **Stack** : React 19 + Vite + TypeScript + Tailwind v4 + Supabase + Anthropic API + Voyage AI
- **Embeddings** : Voyage-3 (1024 dimensions, ajuster VECTOR() dans SQL)
- **Design system** :
  - Navy 600 (#0F2744) dominante
  - Orange 500 (#F57D20) accent
  - Plus Jakarta Sans pour le texte
  - JetBrains Mono pour éléments techniques
- **Bilinguisme** : i18next avec FR par défaut, EN optionnel
- **Tarifs affichés** : Voie A 149 $, Voie B dès 1800 $, Voie C dès 8000 $
- **Hébergement** : Vercel (serverless) + Supabase (DB + Storage)

### Prochaines étapes techniques

**Session technique 2** : Formulaire d'intake + Pipeline 5 skills
**Session technique 3** : Écran de progression SSE + Dashboard rapport
**Session technique 4** : Export DOCX/PDF + Stripe + Beta launch

---

## 15. Note finale

Ce projet transforme un inconfort en produit. Au lieu de forcer Christian
à jouer le rôle de consultant qui vend des audits à la main, l'outil
encode la méthodologie d'audit dans un système qui :
- Rend Christian à l'aise (l'outil garantit la structure, il apporte le
  jugement et le polissage)
- Crée un actif scalable (travaille pendant qu'il dort)
- Qualifie naturellement les prospects pour ses vrais services de
  développement (où son expertise technique est reconnue)

C'est un positionnement produit-first qui capitalise sur ses vraies
forces techniques, contourne ses inconforts, et crée une catégorie de
marché sous-servie au Québec.

---

*Document de contexte rédigé le 22 avril 2026*
*Dernière mise à jour : à faire manuellement quand les patterns évoluent*
