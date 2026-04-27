# Instructions Claude Code — Session 2H : Correction des bugs `opportunity_id` (post-diagnostic 2G)

> **Objectif** : corriger la cause racine commune des 3 bugs identifiés
> dans le diagnostic post-Session 2G — l'absence d'`opportunity_id`
> distinct quand Skill 2 produit plusieurs opportunités sur le même
> pattern. Une fois cette correction en place, les 3 bugs visibles
> dans le rapport DOCX de Marie-Pier disparaissent automatiquement.
>
> **Durée estimée** : 2-3 heures sur 1 session Claude Code.
>
> **Livrables** : schéma Skill 2 enrichi avec `opportunity_id`, prompts
> Skill 2 et Skill 5 mis à jour, DOCX builder rétrocompatible avec
> les 2 formats (avec/sans opportunity_id), audit de Marie-Pier
> Dubuc régénéré et validé visuellement.

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. `git commit -am "session-2h: start"` pour avoir un point de rollback
3. Donner ce document à Claude Code en contexte initial
4. Procéder **étape par étape**, commit après chaque étape avec un
   message clair (`session-2h: step N - description`)
5. Si une étape échoue, corriger avant de passer à la suivante
6. Si une décision semble ambiguë, demander à Christian au lieu de deviner

---

## Décisions structurantes (déjà tranchées, ne pas re-débattre)

- **Cause racine identifiée** : Skill 2 ne fournit pas d'`opportunity_id`
  distinct par opportunité, donc deux opportunités sur le même
  pattern entrent en collision dans le titleMap du DOCX builder.
  Skill 5 invente alors un slug ad-hoc (`${pattern_id}-nurturing`)
  qui fuit dans le rendu.
- **Format de l'opportunity_id retenu** : slug lisible avec double
  tiret comme séparateur, format `${pattern_id}--${kebab-case-angle}`.
  Exemples : `ai-marketing-content-creation--fiches-centris`,
  `ai-marketing-content-creation--reveil-leads`.
- **Stratégie backward compatibility** : tolérante. Le DOCX builder
  accepte les 2 formats (avec ou sans opportunity_id). Si `opportunity_id`
  absent dans l'audit, fallback sur `pattern_id` comme aujourd'hui.
  Cette tolérance permet aux audits historiques de rester lisibles
  sans régénération forcée.
- **Garde-fou Skill 5** : interdit explicitement d'inventer un
  `opportunity_id`. Si Skill 5 voit deux opportunités avec le même
  id en entrée, c'est un bug en amont à signaler dans
  `reviewer_notes`, pas un cas à patcher.
- **Pas de changement aux sous-templates produits** : la matière
  YAML du pattern 004 reste inchangée. Cette session ne touche
  qu'à la plomberie.
- **Marie-Pier Dubuc reste le persona de validation primaire**.
  Audit cible : `5737176f-3048-47ee-bfda-a7b607485b34`.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Sessions 2A à 2G livrées et fonctionnelles
- [ ] Le diagnostic `docs/notes/SESSION_2G_DIAGNOSTIC.md` existe et a
      été lu
- [ ] L'audit Marie-Pier Dubuc existe en DB
      (id `5737176f-3048-47ee-bfda-a7b607485b34` ou plus récent)
- [ ] Variables d'environnement présentes : `VOYAGE_API_KEY`,
      `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`

---

## Étape 0 — Vérification de l'état actuel

**Objectif** : confirmer que le diagnostic reflète bien l'état du code
avant de modifier quoi que ce soit. C'est une étape de prudence —
parfois le code change entre le diagnostic et la correction.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 0 : Vérification de l'état du diagnostic

1. Lis le fichier docs/notes/SESSION_2G_DIAGNOSTIC.md pour rappel
   du contexte.

2. Confirme que les fichiers cibles existent toujours et n'ont pas
   changé depuis le diagnostic :
   - src/lib/ai/schemas.ts (chercher skill2OutputSchema, ligne ~95)
   - src/lib/report/docx-builder.ts (chercher buildOpportunityTitleMap,
     ligne ~339, et titleFor, ligne ~351)
   - src/prompts/skill-2.md ou équivalent
   - src/prompts/skill-5.md ou équivalent
   - docs/specs/skills-prompts-v2.yaml

3. Pour chacun des points clés du diagnostic, vérifie en lisant
   le code que la situation est toujours celle décrite :
   - skill2OutputSchema.selected_opportunities[] ne contient PAS de
     champ opportunity_id
   - buildOpportunityTitleMap indexe toujours sur pattern_id
   - titleFor fait toujours `return titleMap.get(id) ?? id`

4. Si une de ces vérifications échoue (le code a changé entre-temps),
   STOP et signale à Christian. Sinon, on peut commencer.

5. Récupère et garde de côté l'état actuel de l'audit Marie-Pier
   pour comparaison post-correction :

   SELECT
     skill_2_output->'selected_opportunities' as opps_skill2,
     skill_5_output->'roadmap' as roadmap_skill5,
     skill_5_output->'architectures_de_la_solution' as architectures
   FROM audits
   WHERE id = '5737176f-3048-47ee-bfda-a7b607485b34';

   Sauvegarde le résultat dans docs/notes/SESSION_2H_BASELINE.json
   pour pouvoir comparer après la correction.
```

**Critère de réussite** :
- Diagnostic confirmé valide
- Baseline sauvegardée dans docs/notes/SESSION_2H_BASELINE.json
- OK pour passer à l'étape 1

---

## Étape 1 — Modification du schéma Zod de Skill 2

**Objectif** : ajouter `opportunity_id` (requis) au schéma de sortie
de Skill 2.

**Fichier à modifier** : `src/lib/ai/schemas.ts` (ou équivalent où
réside `skill2OutputSchema`)

**Manipulation à demander à Claude Code** :

```
ÉTAPE 1 : Ajouter opportunity_id au schéma Skill 2

1. Ouvre le fichier qui contient skill2OutputSchema. Localise la
   définition de selected_opportunities[].

2. Avant le champ pattern_id (ou en première position), ajoute :

   opportunity_id: z.string()
     .regex(/^[a-z0-9-]+--[a-z0-9-]+$/,
       "opportunity_id doit suivre le format pattern_id--angle (ex: ai-marketing-content-creation--fiches-centris)")
     .describe("Identifiant unique de l'opportunité, format ${pattern_id}--${angle-en-kebab-case}. Quand plusieurs opportunités sont produites sur un même pattern, leurs opportunity_id doivent être distincts."),

3. Vérifie que la regex est correcte avec ces exemples :
   ✓ ai-voice-receptionist--standard
   ✓ ai-marketing-content-creation--fiches-centris
   ✓ ai-marketing-content-creation--reveil-leads
   ✓ ai-meeting-transcription-summary--rencontres
   ✗ ai-marketing-content-creation (pas de séparateur)
   ✗ AI-marketing-CONTENT--fiches (majuscules)
   ✗ ai-marketing--fiches centris (espace)

4. Si la regex est trop stricte ou trop laxe, ajuste-la.

5. Note : le champ est REQUIS, pas optionnel. C'est intentionnel —
   on veut forcer Skill 2 à le produire. Le DOCX builder gérera
   en aval la rétrocompatibilité avec les audits historiques qui
   n'ont pas ce champ.

6. Après modification, lance npm run typecheck pour vérifier que
   les usages downstream se compilent. Probablement Skill 5 et
   le DOCX builder qui consomment selected_opportunities.

7. Si typecheck échoue, NOTE les fichiers concernés pour les étapes
   suivantes mais NE LES CORRIGE PAS encore. On les traite dans
   l'ordre.

8. Affiche le diff final.

9. Commit : "session-2h: step 1 - add opportunity_id to Skill 2 schema"
```

**Critère de réussite** :
- skill2OutputSchema enrichi avec opportunity_id requis
- Regex validée sur les exemples
- typecheck a possiblement des erreurs downstream (attendu — on les
  corrige aux étapes suivantes)

---

## Étape 2 — Mise à jour du prompt Skill 2

**Objectif** : instruire Skill 2 de produire un `opportunity_id`
unique par opportunité, en formalisant explicitement le cas
multi-opportunités sur même pattern.

**Fichiers à modifier** :
- `docs/specs/skills-prompts-v2.yaml` (section skill_2_opportunity_finder)
- `src/prompts/skill-2.md` (si existe — ou prompt hardcodé en TS)

**Manipulation à demander à Claude Code** :

```
ÉTAPE 2 : Mettre à jour le prompt Skill 2

1. Identifie où le system_prompt de Skill 2 est défini :
   a) Dans docs/specs/skills-prompts-v2.yaml uniquement, lu
      dynamiquement
   b) Dans src/prompts/skill-2.md
   c) Hardcodé dans le code TS

   Indique-moi laquelle de ces options est la réalité du repo.

2. Dans le system_prompt de Skill 2, ajoute (après la section
   décrivant comment sélectionner les opportunités) une nouvelle
   section :

   ╔══════════════════════════════════════════════════════════════╗
   ║ FORMAT DE L'OPPORTUNITY_ID                                   ║
   ╠══════════════════════════════════════════════════════════════╣
   ║                                                              ║
   ║ Pour chaque opportunité produite, tu fournis un              ║
   ║ opportunity_id unique au format :                            ║
   ║                                                              ║
   ║   ${pattern_id}--${angle-court-en-kebab-case}                ║
   ║                                                              ║
   ║ Exemples :                                                   ║
   ║ - ai-voice-receptionist--standard                            ║
   ║ - ai-marketing-content-creation--fiches-centris              ║
   ║ - ai-marketing-content-creation--reveil-leads                ║
   ║ - ai-meeting-transcription-summary--rencontres-vendeur       ║
   ║                                                              ║
   ║ L'angle doit être :                                          ║
   ║ - Court (1-3 mots maximum)                                   ║
   ║ - Descriptif du cas d'usage spécifique de cette opportunité  ║
   ║ - En kebab-case (minuscules, tirets simples)                 ║
   ║ - Distinctif (si tu produis 2 opportunités sur le même       ║
   ║   pattern, leurs angles doivent clairement différer)         ║
   ║                                                              ║
   ║ MULTI-OPPORTUNITÉS SUR UN MÊME PATTERN                       ║
   ║                                                              ║
   ║ Tu peux produire plusieurs opportunités basées sur un même   ║
   ║ pattern_id quand le pattern couvre plusieurs angles distincts║
   ║ pertinents pour ce client. Par exemple, le pattern           ║
   ║ ai-marketing-content-creation peut générer :                 ║
   ║ - ai-marketing-content-creation--fiches-centris (fiches      ║
   ║   immobilières)                                              ║
   ║ - ai-marketing-content-creation--reveil-leads (relances      ║
   ║   courriel)                                                  ║
   ║                                                              ║
   ║ Dans ce cas :                                                ║
   ║ - Chaque opportunité a son propre opportunity_id unique      ║
   ║ - Chaque opportunité a son propre adapted_title clairement   ║
   ║   différencié (pas le même libellé)                          ║
   ║ - Chaque opportunité a son propre adapted_description, etc.  ║
   ║                                                              ║
   ║ Ne produis pas plus de 2 opportunités sur un même pattern    ║
   ║ sauf cas exceptionnel.                                       ║
   ║                                                              ║
   ╚══════════════════════════════════════════════════════════════╝

3. Si l'output_schema dans le YAML de spec mentionne
   selected_opportunities, ajoute aussi opportunity_id dans la liste
   des champs requis avec sa description.

4. Affiche les diffs.

5. Commit : "session-2h: step 2 - update Skill 2 prompt with
   opportunity_id format"
```

**Critère de réussite** :
- Skill 2 prompt enrichi avec instructions claires sur le format
- Cas multi-opportunités documenté explicitement
- Spec YAML cohérente avec le prompt

---

## Étape 3 — Mise à jour du prompt Skill 5 (anti-invention de slug)

**Objectif** : interdire à Skill 5 d'inventer des `opportunity_id` et
le forcer à utiliser ceux fournis par Skill 2.

**Fichiers à modifier** :
- `docs/specs/skills-prompts-v2.yaml` (section skill_5_synthesis_roi_roadmap)
- `src/prompts/skill-5.md` (si existe)

**Manipulation à demander à Claude Code** :

```
ÉTAPE 3 : Mettre à jour le prompt Skill 5

1. Localise le system_prompt de Skill 5 (même logique qu'étape 2).

2. Dans le system_prompt, ajoute (avant la section
   INJECTION DES IMPLEMENTATION TEMPLATES qu'on a ajoutée en
   Session 2G) une nouvelle section :

   ╔══════════════════════════════════════════════════════════════╗
   ║ UTILISATION DES OPPORTUNITY_ID                               ║
   ╠══════════════════════════════════════════════════════════════╣
   ║                                                              ║
   ║ Chaque opportunité reçue de Skill 2 a un champ               ║
   ║ opportunity_id unique au format                              ║
   ║ ${pattern_id}--${angle}.                                     ║
   ║                                                              ║
   ║ RÈGLES STRICTES :                                            ║
   ║                                                              ║
   ║ 1. Tu utilises EXACTEMENT les opportunity_id reçus dans      ║
   ║    selected_opportunities. Tu ne les modifies pas.           ║
   ║                                                              ║
   ║ 2. Tu n'INVENTES JAMAIS de nouveau opportunity_id, même      ║
   ║    pour désambiguïser. Si tu vois deux opportunités avec     ║
   ║    le même opportunity_id, c'est un bug en amont :           ║
   ║    note-le dans reviewer_notes mais ne fabrique pas de       ║
   ║    nouveau slug.                                             ║
   ║                                                              ║
   ║ 3. Dans toutes tes structures de sortie qui référencent      ║
   ║    une opportunité (impact_effort_matrix.opportunity_id,     ║
   ║    roadmap.phase_X.opportunities[], roi_estimates[].         ║
   ║    opportunity_id, architectures_de_la_solution[].           ║
   ║    opportunity_id), tu utilises l'opportunity_id complet     ║
   ║    fourni par Skill 2.                                       ║
   ║                                                              ║
   ║ 4. Tu n'utilises JAMAIS pattern_id seul comme référence      ║
   ║    d'opportunité. pattern_id et opportunity_id sont deux     ║
   ║    champs distincts qui ne servent pas à la même chose.      ║
   ║                                                              ║
   ╚══════════════════════════════════════════════════════════════╝

3. Bonus — vérifie aussi le bloc INJECTION DES IMPLEMENTATION
   TEMPLATES de Session 2G : le scoring du sous-template doit
   être fait PAR OPPORTUNITÉ (en utilisant son adapted_title et
   adapted_description), pas globalement à partir du contexte
   client. Si la formulation actuelle est ambiguë sur ce point,
   clarifie : « Pour chaque opportunité de la roadmap, calcule
   indépendamment un score de match avec chaque sous-template du
   pattern source en t'appuyant sur l'opportunity_id, l'adapted_title
   et l'adapted_description de cette opportunité spécifique. »

4. Si l'output_schema du Skill 5 mentionne explicitement les
   structures qui utilisent opportunity_id, vérifie qu'il référence
   bien le champ comme tel et pas comme pattern_id.

5. Affiche les diffs.

6. Commit : "session-2h: step 3 - prevent Skill 5 from inventing
   opportunity_ids"
```

**Critère de réussite** :
- Skill 5 prompt interdit explicitement l'invention de slugs
- Scoring du sous-template clarifié comme étant par opportunité
- Cohérence prompts Skill 2 ↔ Skill 5

---

## Étape 4 — DOCX builder rétrocompatible

**Objectif** : modifier le DOCX builder pour qu'il indexe sur
`opportunity_id` quand il est présent, fallback sur `pattern_id`
sinon. Ainsi les audits historiques restent lisibles.

**Fichier à modifier** : `src/lib/report/docx-builder.ts`

**Manipulation à demander à Claude Code** :

```
ÉTAPE 4 : DOCX builder rétrocompatible

1. Ouvre src/lib/report/docx-builder.ts. Localise
   buildOpportunityTitleMap (ligne ~339).

2. Modifie la fonction pour indexer DOUBLEMENT sur les deux ids
   (opportunity_id si présent, pattern_id pour rétrocompat) :

   function buildOpportunityTitleMap(
     opportunities: Skill2Output['selected_opportunities']
   ): Map<string, string> {
     const map = new Map<string, string>();
     for (const opp of opportunities) {
       // Index principal : opportunity_id si présent
       if (opp.opportunity_id && opp.adapted_title) {
         map.set(opp.opportunity_id, opp.adapted_title);
       }
       // Index secondaire pour rétrocompat : pattern_id
       // (pour les audits historiques sans opportunity_id, ou
       // si Skill 5 référence par pattern_id par erreur)
       if (opp.pattern_id && opp.adapted_title && !map.has(opp.pattern_id)) {
         map.set(opp.pattern_id, opp.adapted_title);
       }
     }
     return map;
   }

   ATTENTION sur la rétrocompat : la condition `!map.has(opp.pattern_id)`
   évite que la 2e occurrence d'un même pattern écrase la 1re sur
   l'index pattern_id. Mais c'est imparfait — pour les audits
   historiques avec 2 opps même pattern, on aura toujours la collision.
   Acceptable parce que ces audits historiques affichaient déjà ce
   bug avant. Pas une régression, juste une non-correction du legacy.

3. Modifie titleFor (ligne ~351) pour qu'il log un warning quand
   l'id n'est pas trouvé :

   function titleFor(id: string, titleMap: Map<string, string>): string {
     const title = titleMap.get(id);
     if (!title) {
       console.warn(`[docx-builder] No title found for opportunity id: ${id}. Falling back to id as title.`);
       return id;
     }
     return title;
   }

4. Vérifie que tous les sites d'appel à titleFor passent bien un
   id qui peut maintenant être un opportunity_id (pas seulement
   pattern_id) :
   - buildImpactEffortMatrix : passe a.opportunity_id (ligne ~586
     selon le diagnostic)
   - buildRoadmap : passe les éléments de phase.opportunities[]
     qui devraient maintenant être des opportunity_id (ligne ~704)
   - buildArchitecturesDeLaSolution : passe a.opportunity_id
     (ligne ~822)
   - buildRoiEstimates : passe r.opportunity_id (ligne ~848)

   Pour chaque site, confirme que la donnée transmise est bien
   l'opportunity_id (champ présent dans skill_5_output produit
   par Skill 5 mis à jour).

5. Lance npm run typecheck. Si Zod a généré de nouveaux types depuis
   l'étape 1, ils peuvent maintenant montrer des erreurs sur les
   sites où on passait pattern_id. Adapter en lisant opportunity_id
   à la place.

6. Affiche les diffs.

7. Commit : "session-2h: step 4 - DOCX builder uses opportunity_id
   with pattern_id fallback for backward compat"
```

**Critère de réussite** :
- buildOpportunityTitleMap indexe sur opportunity_id avec fallback
  pattern_id pour rétrocompat
- titleFor log les fallbacks
- npm run typecheck passe
- Tous les sites d'appel utilisent opportunity_id

---

## Étape 5 — Régénérer l'audit Marie-Pier

**Objectif** : relancer le pipeline complet sur l'audit existant et
vérifier que les 3 bugs ont disparu.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 5 : Régénérer le rapport Marie-Pier et valider

1. Récupère l'auditId Marie-Pier le plus récent
   (5737176f-3048-47ee-bfda-a7b607485b34 ou plus récent si elle a
   un audit plus frais).

2. Déclenche un rerun complet du pipeline. Si l'admin a un bouton
   "Relancer", l'utiliser. Sinon endpoint /api/audit/[id]/rerun
   ou équivalent.

3. Pendant l'exécution, surveille les logs SSE :
   - Skill 2 doit produire des opportunity_id valides
     (regex ${pattern_id}--${angle}). Si erreur de validation
     Zod : noter les exemples produits par Skill 2 et signaler
     à Christian.
   - Skill 5 doit consommer les opportunity_id sans en inventer.
   - Pas de warning "[docx-builder] No title found" dans les
     logs de génération du DOCX.

4. Une fois le pipeline complet, vérifie en SQL :

   SELECT
     skill_2_output->'selected_opportunities' as opps_skill2,
     skill_5_output->'roadmap' as roadmap_skill5,
     skill_5_output->'architectures_de_la_solution' as architectures
   FROM audits
   WHERE id = '<auditId>';

   Compare avec docs/notes/SESSION_2H_BASELINE.json :
   - opps_skill2 : chaque opportunité doit maintenant avoir un
     opportunity_id distinct
   - roadmap_skill5.phase_X.opportunities : doit utiliser des
     opportunity_id, pas des pattern_id ou des slugs inventés
   - architectures_de_la_solution[].opportunity_id : doit
     correspondre à un opportunity_id présent dans
     selected_opportunities

5. Récupère le DOCX généré (storage_path) et notifie Christian
   qu'il est prêt pour validation visuelle.

6. Note dans docs/notes/SESSION_2H_RESULTS.md :
   - Les opportunity_id produits par Skill 2 (liste)
   - Les sub_template_id sélectionnés par Skill 5 (liste)
   - Tout warning ou erreur observé

7. Commit : "session-2h: step 5 - regenerate Marie-Pier audit
   with opportunity_id fix"
```

**Critère de réussite** :
- Pipeline complet sans erreur
- opportunity_id distincts produits par Skill 2
- Skill 5 référence les opportunity_id sans en inventer
- DOCX généré et disponible

---

## Étape 6 — Validation manuelle par Christian

**Objectif** : Christian relit le DOCX régénéré et confirme que les
3 bugs ont disparu.

**Manipulation à faire par Christian** (post-Claude Code) :

1. Télécharger le nouveau rapport DOCX
2. Comparer avec le rapport `audit-marie-pier-lavigne-courtier-immobilier-residentiel-1777254187887.docx`
   pour vérifier les 3 bugs :

   **Bug 1 — Confusion opportunités / architectures** :
   - [ ] La matrice impact/effort liste 4 opportunités distinctes
     (vocal, fiches Centris, transcription, réveil leads), avec
     des titres en français propres.
   - [ ] Les phases de la roadmap listent ces opportunités sans
     ajouter de "Architecture de la solution — X" comme entrées
     parallèles.
   - [ ] L'opportunité « Production de fiches Centris » apparaît
     bien comme une opportunité de la roadmap (probablement en
     phase 1).

   **Bug 2 — ID technique qui fuit** :
   - [ ] Aucune occurrence de
     "ai-marketing-content-creation-nurturing" dans le texte du
     rapport.
   - [ ] Aucun slug technique brut (`pattern_id` ou
     `opportunity_id`) visible côté client.
   - [ ] Tous les noms d'opportunités sont des titres rédigés
     en français.

   **Bug 3 — Mauvais sous-template** :
   - [ ] Sous l'opportunité « Production de fiches Centris »,
     le contenu injecté est bien le sous-template fiches-centris
     (workflow Project Claude pour rédiger des fiches).
   - [ ] Sous l'opportunité « Réveil du Excel de 200+ leads »,
     le contenu injecté est bien le sous-template
     newsletters-nurturing (Brevo, segmentation, séquences
     courriel).

3. Si les 3 bugs sont corrigés : passer à l'étape 7. Sinon, noter
   précisément ce qui reste à corriger et signaler à Claude Code.

**Critère de réussite global de la session** :
- Les 3 bugs identifiés au diagnostic ont disparu
- Aucune régression sur les autres sections du rapport
  (sommaire exécutif, ROI, livrables actionnables, etc.)

---

## Étape 7 — Documentation et planification de la suite

**Objectif** : capturer les apprentissages et préparer la Session 2I
(production des implementation_templates pour les autres patterns).

**Manipulation à demander à Claude Code** :

```
ÉTAPE 7 : Documenter les résultats et planifier la suite

1. Dans docs/notes/SESSION_2H_RESULTS.md, documenter :
   - Verdict global de Christian sur le rapport régénéré
   - opportunity_id produits (liste)
   - sub_template_id sélectionnés
   - Bugs résiduels éventuels
   - Régressions éventuelles

2. Si les 3 bugs sont confirmés corrigés, mettre à jour
   docs/notes/SESSION_2G_DIAGNOSTIC.md avec un en-tête de statut :
   "STATUT : Résolu en Session 2H le [date]."

3. Préparer la liste des sujets pour Session 2I :
   - Produire les implementation_templates pour les patterns 001
     (vocal), 003 (RDV), 005 (courriels), 006 (devis), 007
     (transcription), 008 (RH), 009 (BI) — 7 patterns à template
     unique
   - Produire les sous-templates pour pattern 002 (chatbot) — 3
     sous-templates probables
   - Produire les sous-templates pour pattern 014 (service
     client) — 3 sous-templates probables
   - Re-seed final via Voyage
   - Tests bout-en-bout sur 2-3 personas pour valider le
     fonctionnement multi-secteurs

4. Suggérer dans docs/notes/SESSION_2H_RESULTS.md une priorité
   pour Session 2I :
   - Recommandation : commencer par les 7 patterns à template
     unique (effort moindre, validation du format universel),
     puis attaquer les 2 patterns à sous-templates (002 et 014)
     dans une session subséquente.

5. Commit : "session-2h: step 7 - document results and plan
   Session 2I"
```

**Critère de réussite** :
- Document de bilan complet et exploitable
- Diagnostic 2G mis à jour avec statut résolu
- Plan de Session 2I esquissé

---

## Pièges fréquents et solutions

- **Skill 2 produit des opportunity_id mal formés** (ne respectent
  pas la regex) : Zod va rejeter avec une erreur de validation. Si
  c'est récurrent, le prompt Skill 2 doit être rendu plus prescriptif
  (par exemple, donner 5-6 exemples concrets au lieu de 4). Ne
  désactivez pas la regex pour contourner — c'est elle qui force la
  cohérence.

- **L'audit régénéré contient toujours `pattern_id-nurturing`** :
  c'est que Skill 5 ignore l'instruction « ne pas inventer ». Vérifier
  que le prompt Skill 5 a bien été mis à jour dans la source que le
  pipeline lit (YAML ou hardcodé). Tester la mise à jour en isolant
  Skill 5.

- **Le DOCX builder log "No title found" en masse** : c'est que
  Skill 5 référence des opportunity_id qui ne sont pas dans
  selected_opportunities. Symptôme d'un bug dans Skill 5 (probablement
  le prompt n'est pas assez clair sur la traçabilité strictes des ids).

- **typecheck échoue après l'étape 1** : c'est attendu — les sites
  qui consomment selected_opportunities doivent maintenant gérer le
  nouveau champ. Les corriger aux étapes 3 et 4.

- **Régression sur audits historiques** : si un audit avant Session
  2H ne s'affiche plus correctement après les modifications, c'est
  que le fallback pattern_id n'a pas été correctement implémenté
  dans buildOpportunityTitleMap. Revoir l'étape 4.

---

## Ce qui n'est PAS dans cette session

Pour clarté sur le périmètre :

- **Pas de production des implementation_templates pour les 9 autres
  patterns**. Cette session ne corrige que la plomberie. La production
  de matière reste planifiée pour Session 2I.
- **Pas de modification du Skill 2 sur le scoring/sélection des
  opportunités**. Skill 2 continue de fonctionner comme avant — on
  lui ajoute juste un champ.
- **Pas de migration des audits historiques**. Le DOCX builder
  rétrocompatible permet de les laisser en l'état. Ils s'afficheront
  toujours avec les bugs originaux, mais c'est un legacy connu et
  accepté.
- **Pas de validation P4 du diagnostic** (cohérence first_name /
  business_name dans le formulaire intake). Hors périmètre — sera
  traité dans le backlog des améliorations UX.

---

*Document rédigé le 27 avril 2026.*
*Pré-requis : Sessions 2A à 2G livrées et fonctionnelles, diagnostic
2G livré dans docs/notes/SESSION_2G_DIAGNOSTIC.md.*
*Suite logique attendue : Session 2I pour produire les
implementation_templates des 9 autres patterns.*
