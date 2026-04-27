# Guide des `implementation_templates` — Référence interne 5PennyAi

> **Statut** : Référence canonique pour la production des
> `implementation_templates` dans les patterns YAML.
>
> **Public cible** : Claude (en session de production) + Christian
> (lecteur de relecture).
>
> **À joindre au démarrage de toute session de production de
> nouveaux templates ou de modification d'existants.**
>
> **Date de référence** : 27 avril 2026, après Sessions 2G + 2H et
> validation bout-en-bout sur 2 personas (Marie-Pier Lavigne /
> immobilier, Catherine Mailloux / dentaire).

---

## 1. Pourquoi ce document existe

À travers les Sessions 2G, 2H et le mini-fix associé, nous avons
défini un format complet, validé bout-en-bout, pour enrichir les
patterns YAML avec une nouvelle section `implementation_templates`.
Cette section est consommée par le Skill 5 et injectée dans la
section « Architecture de la solution » du rapport client final.

Le pattern 004 (rédaction de contenu marketing) a été le pattern
pilote, avec 3 sous-templates produits :
- `fiches-centris-immobilier`
- `posts-sociaux-blog`
- `newsletters-nurturing`

Le format est désormais **stable et validé**. Les 9 autres patterns
existants (001, 002, 003, 005, 006, 007, 008, 009, 014) doivent
être enrichis selon le même format pour maintenir la cohérence du
produit.

Ce document capture l'intégralité du savoir-faire pour que la
production puisse continuer sans perte de qualité, indépendamment
de la conversation Claude où elle se déroule.

---

## 2. Philosophie : le positionnement A.5

### 2.1 Le problème à résoudre

Avant les `implementation_templates`, le rapport produit par Skill 5
restait au niveau **stratégique-haut** : il identifiait les
opportunités, recommandait des outils et des voies, mais le client
qui voulait implémenter buttait sur 5-10 questions sans réponse
(« comment exactement configurer Claude pour mes fiches Centris ? »).

À l'inverse, donner toute la solution clé-en-main aurait deux
effets négatifs : (a) supprimer la valeur de l'accompagnement
voie B vendu par 5PennyAi, (b) déresponsabiliser le client en lui
livrant un plug-and-play zéro réflexion.

### 2.2 Le positionnement « A.5 » retenu

Christian a explicitement arbitré pour un niveau de détail **entre
voie A self-serve pure et voie B accompagnée pure** :

> « Ce que je veux à la fin c'est que le client ait l'impression
> qu'il peut faire des choses lui-même, qu'il a quelque chose de
> concret sur lequel il peut agir, sans non plus tout donner de A
> à Z. »

Le client doit progresser par 3 états mentaux successifs en lisant
chaque opportunité :

1. **« Je comprends ce qu'il faut faire »** → transparence stratégique
2. **« Je pourrais essayer moi-même »** → matière concrète et templates
3. **« Mais je vois aussi pourquoi un accompagnement aurait du sens »**
   → pièges visibles + valeur ajoutée explicite

### 2.3 Les 3 principes de design

**Principe 1 — Donner la recette, garder le tour de main.**
Le rapport contient les ingrédients (outils, paramètres), la méthode
(workflow, séquences), les ratios indicatifs (durées, ordres de
grandeur). Il NE contient PAS le contenu prêt-à-coller que seule
l'expérience de plusieurs déploiements affine, ni les arbitrages
contextuels qui demandent l'écoute du client réel, ni la détection
précoce des dérives.

**Principe 2 — Donner des templates, pas des solutions finales.**
Un template oblige le client à réfléchir, adapter, contextualiser.
Il devient acteur, pas exécutant. Concrètement, les marqueurs
`[ADAPTER : ...]`, `[VOTRE NOM]`, `[VOTRE BANNIÈRE]` parsèment les
templates et forcent la personnalisation.

**Principe 3 — Rendre visible le travail invisible de l'expert.**
Une section explicite « Pièges courants à éviter » dans chaque
template montre au client ce qui pourrait mal tourner. Ce sont
précisément les choses que l'accompagnement éviterait. Honnête
(transparence) ET stratégique (justifie la valeur de
l'accompagnement) à la fois.

---

## 3. Choix structurel : approche A vs approche B

### 3.1 Approche A — Template unique par pattern

Pour les patterns dont le cas d'usage est **uniforme**, un seul
`implementation_template` couvre l'esprit du pattern. C'est la
règle par défaut.

Patterns concernés : **001 (vocal), 003 (RDV), 005 (courriels),
006 (devis/factures), 007 (transcription), 008 (RH), 009 (BI)**.

### 3.2 Approche B — Sous-templates par cas d'usage

Pour les patterns dont les cas d'usage sont **vraiment distincts**
(règles, outils auxiliaires, contraintes différents), plusieurs
sous-templates couvrent les usages dominants.

Patterns concernés : **004 (marketing), 002 (chatbot probablement),
014 (service client probablement)**.

### 3.3 Comment trancher

Question à se poser quand on aborde un nouveau pattern :

> « Est-ce que les cas d'usage majeurs nécessitent des outils
> auxiliaires différents OU des contraintes réglementaires
> différentes OU des workflows fondamentalement différents ? »

Si oui → approche B. Si non → approche A.

**Exemples** :
- Pattern 004 : Centris (OACIQ, Matrix), posts sociaux (Canva, MBS),
  newsletters (Brevo, CASL/Loi 25). Outils auxiliaires différents,
  contraintes différentes → **B**
- Pattern 003 : Cal.com, Calendly, Acuity. Cas d'usage uniforme
  (synchroniser un agenda + capter des RDV) → **A**
- Pattern 002 : qualification de leads vs FAQ support vs e-commerce
  WISMO → cas d'usage très distincts → probablement **B**

### 3.4 Pour les patterns à approche B : nombre de sous-templates

**2 à 3 sous-templates maximum** par pattern. Au-delà, le pattern
est probablement mal cadré et devrait être scindé en patterns
distincts. La sélection du sous-template par Skill 5 devient aussi
imprécise avec trop de candidats.

---

## 4. Schéma YAML complet

Voici le schéma définitif d'un `implementation_template`, validé
sur 3 sous-templates du pattern 004. Tous les patterns à enrichir
doivent suivre exactement cette structure.

```yaml
implementation_templates:
  - id: <slug-en-kebab-case>                  # Ex: fiches-centris-immobilier
    use_case_fr: |                            # Description du cas d'usage couvert
      <2-4 lignes décrivant ce que ce template permet de produire
      et pour qui>

    triggers_when:                            # Critères pour le scoring de Skill 5
      industry_in:                            # Industries cibles spécifiques
        - <industry-tag-1>
        - <industry-tag-2>
      automation_wish_keywords:               # Mots-clés à matcher dans
        - <keyword-1>                         # automation_wish ou
        - <keyword-2>                         # time_consuming_tasks
      tools_to_recommend:                     # Outils centraux du template
        - <tool-id-1>

    # ╔═════════════════════════════════════╗
    # ║ VOIE A — SELF-SERVE                 ║
    # ╚═════════════════════════════════════╝
    voie_a_self_serve:

      overview_fr: |
        <Vue d'ensemble de la solution en self-serve : 4-6 lignes
        qui décrivent le résultat final attendu, l'ordre de grandeur
        de gain de temps, et la logique générale de la solution>

      stack_fr:                               # Liste des outils nécessaires
        - tool: <Nom de l'outil>
          cost: <prix avec devise>
          why_fr: |
            <Justification de ce choix d'outil, 2-3 lignes>
        - tool: <Outil 2>
          cost: <prix>
          why_fr: |
            <Justification>

      configuration_fr:                       # Configuration en 3 étapes
        step_1_<id-court>:
          title_fr: 1. <Titre de l'étape>
          duration: <durée estimée>
          instructions_fr: |
            <Instructions précises, ordre des actions à faire>
          # Si l'étape inclut un texte à coller dans un outil :
          template_to_paste_fr: |
            <Le contenu à coller, avec marqueurs [ADAPTER : ...] aux
            endroits qui demandent personnalisation>

        step_2_<id-court>:
          title_fr: 2. <Titre>
          duration: <durée>
          instructions_fr: |
            <Instructions>
          template_to_paste_fr: |              # Optionnel
            <Si applicable>

        step_3_<id-court>:
          title_fr: 3. <Titre>
          duration: <durée>
          instructions_fr: |
            <Instructions>

      workflow_fr:
        title_fr: Workflow opérationnel <quotidien|hebdomadaire|mensuel>
        steps_fr:
          - step: <Action concrète à faire>
            details_fr: |
              <Détails sur comment faire cette action>
          - step: <Action 2>
            details_fr: |
              <Détails>
          # 4-6 étapes typiquement, le total doit donner un ordre
          # de grandeur de durée par cycle (ex : 10-12 min/fiche)

      validation_method_fr:                   # Méthode des 4 premières semaines
        title_fr: Méthode de validation initiale (4 premières semaines)
        weeks_fr:
          - week: 1
            action_fr: |
              <Quoi faire en semaine 1 — typiquement comparer
              méthode IA vs méthode actuelle>
          - week: 2-3
            action_fr: |
              <Ajustements selon les écarts détectés>
          - week: 4
            action_fr: |
              <Verrouillage de la version 1.0>
        ongoing_fr: |
          <Maintenance après les 4 premières semaines : fréquence,
          actions à faire>

      pitfalls_fr:
        title_fr: Pièges courants à éviter
        items_fr:
          - pitfall: <Description courte du piège>
            why_problematic_fr: |
              <Pourquoi c'est un problème, conséquences>
            how_to_avoid_fr: |
              <Comment l'éviter concrètement>
          # 4-6 pièges typiquement. C'est la section qui démontre
          # l'expertise et justifie la valeur de l'accompagnement.

      success_criteria_fr:
        title_fr: Critères de succès mesurables
        milestones_fr:
          - timeframe: 30 jours
            criteria_fr: |
              <Critères concrets et mesurables à 30 jours>
          - timeframe: 60 jours
            criteria_fr: |
              <Critères à 60 jours>
          - timeframe: 90 jours
            criteria_fr: |
              <Critères à 90 jours>

      when_accompaniment_makes_sense_fr:
        title_fr: Signaux qu'un accompagnement deviendrait pertinent
        items_fr:
          - <Signal 1 — ex: "Vous n'arrivez pas à descendre sous X
            après Y semaines">
          - <Signal 2>
          - <Signal 3>
          # 4-5 signaux typiquement

    # ╔═════════════════════════════════════╗
    # ║ VOIE B — ACCOMPAGNÉ                 ║
    # ╚═════════════════════════════════════╝
    voie_b_accompagnee:

      includes_voie_a_fr: |
        <Mention que le voie B inclut tout le voie A exécuté pour
        le client, plus les éléments suivants>

      what_we_do_for_you_fr:
        title_fr: Ce que nous faisons à votre place
        items_fr:
          - service: <Nom du service>
            details_fr: |
              <Description précise du service>
            estimated_value_hours: <X-Y>      # Heures à montrer au client
          - service: <Service 2>
            details_fr: |
              <Description>
            estimated_value_hours: <X-Y>
          # 5-7 services typiquement, totalisant 10-20 heures

      what_we_bring_that_text_cannot_fr:
        title_fr: Ce qui ne se transmet pas par écrit
        items_fr:
          - element: <Élément 1>
            why_fr: |
              <Pourquoi cet élément ne peut pas être transmis par
              un simple template — argument qui démontre l'expertise>
          - element: <Élément 2>
            why_fr: |
              <Pourquoi>
          # 3-5 éléments typiquement

      total_investment_fr:
        accompaniment_cad: <X - Y> $
        ongoing_monthly_cad: <montant>
        client_time_required_hours: <X-Y> (vs <X-Y> en voie A pure)
        time_to_operational_weeks: <X-Y> (vs <X-Y> en voie A pure)

      deliverables_fr:
        title_fr: Livrables tangibles que vous recevez
        items_fr:
          - <Livrable 1 — concret, identifiable>
          - <Livrable 2>
          # 6-9 livrables typiquement
```

---

## 5. Logique de scoring (Skill 5)

Quand le rapport contient plusieurs sous-templates pour un pattern
matché, le Skill 5 calcule un **score de match** par sous-template
pour chaque opportunité, et sélectionne celui avec le score le plus
élevé.

### 5.1 Règle de scoring

Pour chaque sous-template, score initial = 0.

- **+3** si l'industrie du client (`intake.industry` ou
  `business_profile.industry_vertical`) est dans
  `triggers_when.industry_in`
- **+2** par mot-clé du `time_consuming_tasks` ou `automation_wish`
  qui apparaît dans `triggers_when.automation_wish_keywords`
- **+1** si un outil recommandé pour cette opportunité apparaît
  dans `triggers_when.tools_to_recommend`

### 5.2 Tie-breaking

Si égalité parfaite : prendre le premier sous-template dans l'ordre
du YAML.

### 5.3 Aucun match

Si tous les sous-templates ont un score de 0 : prendre le premier
avec un avertissement dans `reviewer_notes` du Skill 5.

### 5.4 Exemples validés

**Marie-Pier Lavigne (immobilière), pour son opportunité « Production
de fiches Centris »** :
- `fiches-centris-immobilier` : industrie immo (+3) + keyword
  « centris » (+2) + outil claude-pro (+1) = **6 points** ✓
- `posts-sociaux-blog` : industrie immo (+3) + outil claude (+1) =
  4 points
- `newsletters-nurturing` : industrie immo (+3) + outil claude (+1) =
  4 points

→ Sélection correcte de `fiches-centris-immobilier`.

**Marie-Pier Lavigne, pour son opportunité « Réveil du Excel de
200+ leads tièdes »** :
- `fiches-centris-immobilier` : industrie immo (+3) + outil claude
  (+1) = 4 points
- `posts-sociaux-blog` : industrie immo (+3) + outil claude (+1) =
  4 points
- `newsletters-nurturing` : industrie immo (+3) + keywords
  « nurturing » (+2) + « leads tièdes » (+2) + outil brevo (+1) =
  **8 points** ✓

→ Sélection correcte de `newsletters-nurturing`.

### 5.5 Important : le scoring se fait PAR OPPORTUNITÉ

Pas par contexte client global. C'est l'`adapted_title` et
l'`adapted_description` de l'opportunité spécifique qui guident le
scoring, pas le `time_consuming_tasks` global du client.

---

## 6. Marqueurs de personnalisation

Les `template_to_paste_fr` et certaines instructions contiennent
des marqueurs que le Skill 5 substitue automatiquement par les
valeurs du contexte client.

### 6.1 Marqueurs supportés

| Marqueur | Substitué par | Source |
|---|---|---|
| `[VOTRE NOM]` | `intake.first_name + last_name` ou `business_name` | intake_data |
| `[VOTRE BANNIÈRE]` | Bannière mentionnée dans `additional_context` | intake_data |
| `[VOTRE MARQUE]` | `business_name` | intake_data |
| `[SECTEUR]` | `industry_vertical` du Skill 1 | skill_1_output |
| `[ADAPTER : <précision>]` | Garder le marqueur si pas de matière, ou produire suggestion contextuelle | logique Skill 5 |

### 6.2 Quand utiliser quel marqueur

**Utiliser un marqueur précis** (`[VOTRE NOM]`, `[VOTRE BANNIÈRE]`)
quand l'élément est probablement dans le contexte client. Le Skill 5
substituera automatiquement.

**Utiliser `[ADAPTER : ...]`** quand l'élément demande un choix du
client qui ne peut pas être deviné depuis le contexte (ex :
positionnement de marque, ton préféré, niveau de formalité). Ces
marqueurs RESTENT dans le rapport final pour signaler au client
qu'il a une décision à prendre.

### 6.3 Validation

Le Skill 5 substitue les marqueurs en faisant une analyse
contextuelle. Si le contexte ne permet pas de remplir un marqueur
avec confiance, le marqueur reste affiché. C'est intentionnel —
mieux vaut un marqueur visible qu'une substitution erronée.

---

## 7. Densité naturelle des templates

Le format ne doit pas être un objectif en soi. La densité varie
selon le cas d'usage.

### 7.1 Plages observées (validées sur le pattern 004)

| Cas d'usage | Lignes YAML | Caractéristiques |
|---|---|---|
| Centris (réglementé) | 389 | Riche en règles OACIQ, garde-fous légaux |
| Posts sociaux (créatif) | 500 | Riche sur voix de marque, calendrier éditorial |
| Newsletters (hybride) | 519 | Riche sur conformité Loi 25/CASL + segmentation |

### 7.2 Plages attendues pour les autres patterns

- Patterns plug-and-play (003 RDV, 005 courriels) : 250-350 lignes
- Patterns moyens (006, 007, 008, 009) : 350-450 lignes
- Patterns complexes avec sous-templates (002, 014) : 400-520 lignes
  par sous-template

### 7.3 Règle d'or

**Densité = densité de valeur par ligne, pas longueur cible**.
Un template plus court mais dense vaut mieux qu'un template long
qui dilue le signal. Si un cas d'usage ne nécessite pas une
section riche (ex : pas de réglementation pour un calendrier
RDV), accepter qu'elle soit plus courte.

### 7.4 Limite haute

Ne dépasse pas **600 lignes** pour un seul template/sous-template.
Au-delà, le contenu devient difficile à parcourir pour le client
et l'embedding source du pattern enrichi devient problématique.

---

## 8. Validation_method : règle d'adaptation

Le bloc `validation_method_fr` à 4 semaines est une partie
structurante mais doit s'adapter au type de pattern.

### 8.1 Patterns qui méritent une validation 4 semaines complète

Patterns où l'apprentissage est progressif et où le calibrage IA
prend du temps :
- 002 chatbot
- 004 marketing (Centris, sociaux, newsletters)
- 005 courriels
- 007 transcription
- 014 service client

### 8.2 Patterns plug-and-play à validation simplifiée

Patterns où la mise en service est rapide et où il y a peu à
calibrer (ex : Cal.com configuré en 2 heures n'a pas besoin de
4 semaines de validation).

Pour ces cas, simplifier en :

```yaml
validation_method_fr:
  title_fr: Mise en service et premier contrôle
  steps_fr:
    - phase: Mise en service
      action_fr: |
        <Configuration initiale + tests>
    - phase: Premier contrôle à 30 jours
      action_fr: |
        <Vérification que tout fonctionne et ajustements>
  ongoing_fr: |
    <Maintenance trimestrielle ou annuelle>
```

Patterns concernés : **003 (RDV)**.

### 8.3 Cas hybrides

**006 (devis/factures)** et **009 (BI)** ont des éléments des deux.
À calibrer au cas par cas selon la complexité du sous-template.

---

## 9. Connexion avec le pipeline (post-Sessions 2G/2H)

### 9.1 Structure DB

Les `implementation_templates` sont stockés dans le champ `content`
JSONB de la table `patterns`. Pas de table séparée.

**Stockage disque (depuis Session 2J — architecture C hybride)** :

Deux formats sont supportés selon la complexité du pattern :

- **Pattern à template unique (approche A)** → un seul fichier YAML
  à la racine de `/patterns/`, avec la section
  `implementation_templates` intégrée comme avant.
  Exemple : `patterns/pattern-001-receptionniste-ia-vocale.yaml`

- **Pattern à plusieurs sous-templates (approche B)** → un dossier
  par pattern, contenant :
  - `_pattern.yaml` : le pattern de base (sans la section
    `implementation_templates`)
  - Un fichier `<sub-template-id>.yaml` par sous-template, avec
    `type: implementation_template` en première ligne
  
  Exemple : `patterns/pattern-004-redaction-contenu-marketing/`
  contient `_pattern.yaml`, `fiches-centris-immobilier.yaml`,
  `posts-sociaux-blog.yaml`, `newsletters-nurturing.yaml`.

Le script `seed-patterns.js` détecte le format automatiquement
(`fs.statSync().isDirectory()`) et fusionne pattern + sous-templates
**en mémoire** avant l'upsert. La DB stocke toujours le pattern
complet dans `content` JSONB — schéma identique pour les deux
formats. Le pipeline aval (Skill 5, DOCX builder) est totalement
transparent au choix du format de stockage.

**Conséquence** : pour produire un nouveau pattern à plusieurs
sous-templates (ex. patterns 002, 014), créer directement le
dossier avec `_pattern.yaml` + un fichier YAML par sous-template.
Ne JAMAIS produire un fichier monolithique de 2000+ lignes.

**Ordre des sous-templates** : tri alphabétique du nom de fichier
(déterministe). Le matching Skill 5 étant basé sur les `triggers_when`
(industries, keywords) et non sur l'ordre, ce tri n'a aucun impact
fonctionnel.

### 9.2 Embedding source

Le script `seed-patterns.js` (fonction `buildEmbeddingSource`)
exploite les `implementation_templates` pour enrichir le matching
sémantique :

- Inclure `use_case_fr` de chaque sous-template
- Inclure les keywords de `triggers_when.automation_wish_keywords`
- Inclure les industries de `triggers_when.industry_in`

NE PAS inclure le détail complet des `voie_a_self_serve` ou
`voie_b_accompagnee` — cela noierait le signal sémantique principal.

### 9.3 Limite d'embedding source

10 000 caractères maximum par pattern. Augmenté de 6 000 en Session
2F après troncature observée sur les patterns enrichis.

### 9.4 Re-seed après modification

Toute modification d'un pattern YAML impose un re-seed via
`npm run seed:patterns` pour mettre à jour le content JSONB et
l'embedding en DB.

### 9.5 opportunity_id formel (Session 2H)

Skill 2 produit obligatoirement un `opportunity_id` au format
`${pattern_id}--${kebab-case-angle}` pour chaque opportunité, même
si une seule opportunité est produite par pattern.

Exemples valides :
- `ai-voice-receptionist--standard`
- `ai-marketing-content-creation--fiches-centris`
- `ai-meeting-transcription-summary--rencontres-vendeur-acheteur`

Skill 5 utilise ces `opportunity_id` partout (impact_effort_matrix,
roadmap, architectures_de_la_solution, roi_estimates) sans jamais
en inventer de nouveaux.

---

## 10. Pièges courants à éviter lors de la production

Apprentissages des sessions 2G/2H et des deux tests bout-en-bout
(Marie-Pier + Catherine).

### 10.1 Sur le format

- **Échappement YAML des `:` dans les valeurs scalaires.** Une
  ligne `details_fr: Total estimé : 10-12 minutes` casse le parser
  YAML. Toujours encadrer ces valeurs de guillemets simples ou
  utiliser un block scalar `|`.

- **Format dossier (architecture C) : champ `type` obligatoire.**
  Pour les patterns à plusieurs sous-templates stockés en
  dossier, chaque fichier de sous-template DOIT déclarer
  `type: implementation_template` à la racine, sinon le seed
  l'ignore avec un warning. Le pattern de base (`_pattern.yaml`)
  ne porte pas ce champ.

- **Indentation cohérente.** Les sous-templates doivent commencer
  par `  - id:` (2 espaces + tiret) car ils sont des éléments d'une
  liste `implementation_templates:`. Un test isolé en YAML
  standalone échoue mais ce n'est pas un bug — c'est l'intégration
  dans le pattern parent qui les rend valides.

- **Champ `id` obligatoire** sur chaque sous-template. C'est lui
  qui devient le `sub_template_id` dans l'output Skill 5.

### 10.2 Sur le contenu

- **Ne pas inventer de chiffres.** Si une statistique est citée,
  elle doit venir d'une source nommée. Si on n'en a pas, formuler
  en ordre de grandeur (« typiquement », « selon les benchmarks
  sectoriels ») sans préciser une source fictive.

- **Garder les marqueurs `[ADAPTER]` neutres.** Ne pas glisser
  un parti-pris dans la description (« [ADAPTER : choisir un ton
  premium qui valorise votre expertise »]). La formulation doit
  donner le choix au client.

- **Ne pas dupliquer la matière entre voie A et voie B.** Le voie B
  inclut implicitement le voie A — il ne faut pas réécrire
  l'ensemble. Le `includes_voie_a_fr` le mentionne en une phrase.

- **Spécifier les coûts en CAD pour le marché québécois.** Si un
  outil est facturé en USD, le mentionner dans le prix mais aussi
  donner une équivalence CAD approximative pour faciliter la lecture.

### 10.3 Sur les triggers_when

- **Granularité des keywords.** Mettre les mots qu'un client
  utiliserait probablement dans son intake. « rappel », « no-show »,
  « rendez-vous », pas « scheduling system » (terme expert).

- **Tools_to_recommend = outils centraux.** Si le template repose
  sur Claude + Brevo, ne mettre que ces 2 outils. Ne pas lister
  tous les outils mentionnés en passant.

- **industry_in doit matcher des industries existantes.** Cohérent
  avec les `target_industries` du pattern parent. Ne pas inventer
  des industries qui ne sont pas dans la liste maîtresse.

### 10.4 Sur l'équilibre commercial

- **Justifier la voie B sans dévaloriser la voie A.** Le client
  voie A doit pouvoir réussir avec les instructions données. Le
  voie B apporte de la sécurité, du gain de temps, et de
  l'expertise — pas un changement fondamental de ce qui est livré.

- **Ne pas exagérer les estimated_value_hours.** Si on dit que la
  configuration prend 3-5 heures, ça doit être réaliste. Le client
  qui choisit voie B vérifiera.

- **Mentionner systématiquement le coût récurrent.** Pas seulement
  l'investissement initial. Le client doit pouvoir budgétiser sur
  12-24 mois.

### 10.5 Sur l'adaptabilité au client

- **Penser au cas où l'industrie du client n'est dans AUCUN
  industry_in du sous-template.** Le sous-template doit rester
  utilisable même si le client est dans une industrie « autre ».
  C'est ce qui s'est passé pour Catherine Mailloux (dentaire) sur
  les patterns 003/005 — qui n'ont pas encore d'implementation_templates,
  mais le principe vaut pour la suite.

- **Marqueurs adaptables au profil.** Si un sous-template parle
  d'un cas réglementé (Centris/OACIQ), il faut accepter qu'il ne
  soit pas pertinent pour des secteurs hors immobilier — d'où la
  logique de scoring qui ne le sélectionnera pas.

---

## 11. Apprentissages des bugs corrigés (Session 2H)

### 11.1 Bug : opportunity_id manquant dans Skill 2

**Symptôme** : quand Skill 2 produit deux opportunités sur le même
pattern (cas Marie-Pier avec pattern 004), elles entrent en
collision dans le titleMap du DOCX builder.

**Cause racine** : le schéma Skill 2 n'avait pas de champ
`opportunity_id` distinct. Indexation par `pattern_id` provoquait
un écrasement.

**Fix** : `opportunity_id` ajouté comme champ requis dans le schéma
Zod, avec regex `^[a-z0-9-]+--[a-z0-9-]+$`. Format
`${pattern_id}--${angle}`.

**Implication pour la production** : ce n'est plus un sujet pour
les producteurs de templates. Skill 2 et Skill 5 gèrent ça en aval.
Mais à savoir : si on observe à nouveau des collisions ou des slugs
inventés, c'est un bug en amont à signaler, pas à patcher au niveau
template.

### 11.2 Bug : doublon des architectures dans la roadmap

**Symptôme** : la phase 1 listait `Architecture de la solution — X`
comme un item parallèle à l'opportunité X.

**Cause racine** : DOCX builder ajoutait un sous-titre par
opportunité dans la liste OPPORTUNITÉS TRAITÉES.

**Fix** : suppression du sous-titre dans `buildRoadmap`. La section
H1 « Architecture de la solution » dédiée plus loin dans le rapport
contient maintenant tout le détail.

**Implication pour la production** : aucune côté template. Mais
la structure du rapport final est maintenant : roadmap (titres
seulement) + section Architecture (tout le contenu détaillé des
sous-templates). À garder en tête quand on rédige des `overview_fr`
qui doivent se suffire à eux-mêmes en lecture rapide.

---

## 12. Patterns existants — état au 27 avril 2026

| ID | Title | Approche | Status implementation_templates |
|---|---|---|---|
| 001 | ai-voice-receptionist | A | À produire (Session 2I) |
| 002 | ai-text-chatbot-multichannel | B (3 sous-templates probables) | À produire (Session 2I+) |
| 003 | ai-appointment-scheduling | A | À produire (Session 2I) |
| 004 | ai-marketing-content-creation | B | ✅ Complet (3 sous-templates) |
| 005 | ai-email-management | A | À produire (Session 2I) |
| 006 | ai-quote-invoice-automation | A | À produire (Session 2I) |
| 007 | ai-meeting-transcription-summary | A | À produire (Session 2I) |
| 008 | ai-hr-recruitment-automation | A | À produire (Session 2I) |
| 009 | ai-data-dashboards | A | À produire (Session 2I) |
| 014 | ai-customer-support-helpdesk | B (3 sous-templates probables) | À produire (Session 2I+) |

### 12.1 Suggestion d'ordre de production

**Session 2I — patterns à template unique (priorité)** :
1. 003 (RDV) — plug-and-play, valide le format simplifié de
   validation_method
2. 005 (courriels) — moyennement complexe
3. 007 (transcription) — moyennement complexe
4. 001 (vocal) — moyennement complexe avec Loi 25
5. 009 (BI) — moyennement complexe
6. 008 (RH) — un peu spécifique à PME 5+ employés
7. 006 (devis/factures) — un peu spécifique aux services

**Session 2J — patterns à sous-templates** :
1. 002 (chatbot) — sous-templates probables : qualification leads,
   FAQ support, e-commerce WISMO
2. 014 (service client) — sous-templates probables : helpdesk PME
   généraliste, e-commerce Shopify, SaaS conversationnel

### 12.2 Estimation horaire

Sur la base du pattern 004 (3 sous-templates en ~4-5 heures
totales) :

- Template unique : 30-45 minutes par template
- Sous-template (approche B) : 45-60 minutes par sous-template

**Total Session 2I (7 patterns à template unique)** : ~4-5 heures
**Total Session 2J (2 patterns × 3 sous-templates)** : ~5-6 heures

---

## 13. Comment utiliser ce document

### 13.1 Au démarrage d'une session de production

Joindre ce document au contexte initial de la conversation Claude
(.ai ou Code) avec un message comme :

> « On démarre la production des `implementation_templates` pour
> les patterns 001, 003, 005. Voici le document de référence
> définissant le format et les principes
> [GUIDE_IMPLEMENTATION_TEMPLATES.md].
>
> Lis-le et confirme que tu as bien intégré : la philosophie A.5,
> l'approche A vs B, le schéma YAML complet, et la logique de
> scoring. Ensuite on commence par le pattern 003. »

### 13.2 Pendant la production

Vérifier la cohérence avec le document à chaque template produit :
- [ ] Le schéma YAML est respecté section par section
- [ ] Les marqueurs `[ADAPTER]`, `[VOTRE NOM]`, etc. sont utilisés
  où pertinent
- [ ] Les pièges courants sont énoncés (4-6 minimum)
- [ ] Les estimated_value_hours sont réalistes
- [ ] La densité naturelle est respectée (pas de remplissage)
- [ ] Les triggers_when sont cohérents (industries existantes,
  keywords pertinents)

### 13.3 Après la production

Avant intégration au pattern parent :
- [ ] YAML validé (parser Python ou Node)
- [ ] Pas de `:` non échappé dans les valeurs scalaires
- [ ] Cohérence avec le pattern parent (target_industries,
  target_business_sizes)

### 13.4 Mise à jour de ce document

Ce document est **vivant**. Si une nouvelle session de production
révèle un cas d'usage non couvert, un nouveau marqueur, une
nouvelle convention, **mettre à jour ce document** avant de
clôturer la session. Sinon le savoir-faire repart en mémoire
volatile.

---

*Document rédigé le 27 avril 2026.*
*Validé sur 2 personas bout-en-bout : Marie-Pier Lavigne (immo) +
Catherine Mailloux (dentaire).*
*À mettre à jour après chaque session de production de templates
qui révèle de nouvelles conventions ou apprentissages.*
