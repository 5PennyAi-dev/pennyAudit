# Session 2B-bis — Enrichissement éditorial du pipeline d'audit

*Document produit le 24 avril 2026 pour la Session Claude Code 2B-bis.*
*À lire en conjonction avec `skills-prompts-v2.yaml`, `intake-form-v1.yaml`
et `PROJECT_STATE.md`.*

---

## Objectif de la session

Densifier le livrable final pour qu'il corresponde au positionnement
"audit enrichi à 149-299 $ CAD". Trois changements majeurs :

1. **Skill 1** — activation de `web_search` et ajout d'un Portrait sectoriel
   chiffré + extraction normalisée des chiffres du texte libre client.
2. **Skill 2** — estimation chiffrée personnalisée par opportunité, basée
   sur les chiffres du client ou les benchmarks sectoriels.
3. **Skill 5** — consolidation prudente des gains entre opportunités +
   2-4 livrables actionnables personnalisés par client (prompts Claude
   sectoriels, politique Loi 25 pré-remplie, checklist fournisseur,
   workflow de démarrage, tableau de KPIs).

Plus quelques corrections mineures (helper_text Q10, nom Couillard,
temperature retirée).

**Effort estimé** : 2-3 heures Claude Code (8 étapes).

**Principe** : `skills-prompts-v2.yaml` est la source de vérité. Tous
les changements de prompts backend doivent refléter ce fichier
exactement.

---

## Prérequis à vérifier avant de démarrer

- [ ] Le fichier `skills-prompts-v2.yaml` est présent à la racine du repo
      (à copier depuis les livrables de la session chat).
- [ ] Les Sessions 2A et 2B ont été complétées et l'audit Sophie Tremblay
      tourne correctement avec la v1.
- [ ] `ANTHROPIC_API_KEY` est valide et a accès aux modèles Opus 4.7.
- [ ] La branche de travail est créée (`git checkout -b session-2b-bis`).

---

## Étape 1 — Mise à jour du helper_text et placeholder de la question 10

**Fichier à modifier** : `intake-form-v1.yaml`

**Action** : remplacer la question `time_consuming_tasks` (écran 4, bloc 3)
par la version bonifiée qui pousse les chiffres concrets.

**Diff à appliquer** :

```yaml
# AVANT (v1)
- id: time_consuming_tasks
  type: textarea
  label: "Quelles tâches prennent le plus de temps à vous ou à votre équipe ?"
  placeholder: |
    Exemple : Je passe environ 2 heures par jour à répondre aux mêmes
    questions de clients au téléphone et par courriel, surtout pour
    les prises de rendez-vous et les questions sur les tarifs.
  helper_text: |
    ⚡ Astuce : plus votre réponse est précise et détaillée (exemples
    concrets, temps passé, fréquence), plus votre audit sera pertinent.
  required: true
  min_length: 50
  max_length: 2000
  skills_used: [2]
  purpose: "Champ principal pour le matching sémantique via embeddings pgvector"

# APRÈS (v2)
- id: time_consuming_tasks
  type: textarea
  label: "Quelles tâches prennent le plus de temps à vous ou à votre équipe ?"
  placeholder: |
    Exemple : Je passe environ 2 heures par jour à répondre aux mêmes
    questions de clients au téléphone et par courriel, surtout pour les
    prises de rendez-vous et les questions sur les tarifs. Je reçois à peu
    près 30-40 appels par semaine, et je dirais qu'une bonne moitié sont
    des demandes d'info répétitives qu'un bon système pourrait traiter.
  helper_text: |
    ⚡ Astuce : les chiffres rendent votre audit beaucoup plus concret.
    Essayez d'inclure des ordres de grandeur — heures par semaine passées
    sur la tâche, nombre de clients, dossiers ou transactions traités par
    mois, montants moyens si pertinent. Des estimations « à la louche »
    suffisent (ex. « environ 5 h/semaine », « entre 20 et 30 dossiers par
    mois »).
  required: true
  min_length: 50
  max_length: 2000
  skills_used: [2]
  purpose: "Champ principal pour le matching sémantique via embeddings pgvector. En v2, aussi la source principale de extracted_client_figures du Skill 1."
```

**Important** : `min_length: 50` reste inchangé (décision Christian —
on ne force pas les clients pressés à écrire plus).

**Vérification côté frontend** : s'assurer que le composant `TextAreaField`
qui rend la question affiche le nouveau helper_text et le nouveau
placeholder. Si les textes sont hardcodés quelque part dans les composants
React plutôt que lus depuis le YAML, les mettre à jour aussi.

**Commit** : `session-2b-bis: step 1 - enrich Q10 helper_text for numeric data`

---

## Étape 2 — Remplacer skills-prompts-v1.yaml par skills-prompts-v2.yaml

**Fichier à remplacer** : `skills-prompts-v1.yaml`

**Actions** :

1. Vérifier où `skills-prompts-v1.yaml` est consommé dans le code. Probablement :
   - `src/lib/ai/prompts.ts` (ou similaire) qui charge les prompts depuis le YAML
   - `api/audit/run.ts` qui orchestre les skills
   - Éventuels fichiers .md décomposés depuis le YAML si l'implémentation
     avait opté pour cette voie (`/prompts/skill_1.md`, etc.)

2. Copier le nouveau `skills-prompts-v2.yaml` à la racine du repo.

3. Si le code référence `skills-prompts-v1.yaml` par son nom, faire un
   choix :
   - **Option A** (recommandée) : renommer le fichier cible en
     `skills-prompts-v2.yaml` dans le code pour versionnage clair.
   - **Option B** : remplacer le contenu de `skills-prompts-v1.yaml` par
     celui de la v2 en ajustant juste `meta.version: "2.0"` (moins propre).

4. Supprimer `skills-prompts-v1.yaml` (si Option A) après vérification
   que tout fonctionne.

5. Si des prompts sont décomposés en fichiers .md séparés, les
   régénérer depuis la v2 ou les remplacer un à un.

**Critère de réussite** : le pipeline lit les nouveaux prompts au démarrage
d'un audit. Vérifier en lançant un audit de dev et en inspectant les logs
pour voir que les nouvelles sections (PORTRAIT SECTORIEL CHIFFRÉ,
ESTIMATION CHIFFRÉE PERSONNALISÉE, LIVRABLES ACTIONNABLES) sont bien dans
les prompts envoyés à l'API Anthropic.

**Commit** : `session-2b-bis: step 2 - replace skills-prompts v1 with v2`

---

## Étape 3 — Activer web_search sur le Skill 1

**Fichier à modifier** : `src/lib/ai/anthropic.ts` (ou fichier équivalent
qui wrap l'appel à l'API Anthropic pour les skills)

**Objectif** : ajouter l'outil `web_search` à l'appel API du Skill 1
uniquement. Les Skills 2-5 restent sans tools.

**Exemple de modification** (à adapter selon l'implémentation existante) :

```typescript
// Dans la fonction qui appelle l'API pour un skill donné :

const callSkill = async (skillId: string, prompt: string, input: object) => {
  const skillConfig = loadSkillConfig(skillId); // Lit depuis skills-prompts-v2.yaml

  const tools = skillConfig.tools
    ? skillConfig.tools.map(t => ({
        type: t.type,
        name: t.name,
        max_uses: t.max_uses,
      }))
    : undefined;

  const response = await anthropic.messages.create({
    model: skillConfig.model, // 'claude-opus-4-7'
    max_tokens: skillConfig.max_tokens,
    system: skillConfig.system_prompt,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
    tools, // présent uniquement pour Skill 1 en v2
  });

  return response;
};
```

**Points d'attention** :

- Le format exact du paramètre `tools` pour web_search suit la doc
  Anthropic : `{ type: "web_search_20250305", name: "web_search", max_uses: 5 }`.
- Le SDK Anthropic peut gérer les tool_use blocks automatiquement ou
  nécessiter une boucle de retours (à vérifier selon la version du SDK).
- Le coût de web_search doit être tracké dans la table des coûts
  (`admin/costs` endpoint) — chaque requête web_search coûte ~0.01 $ US.
  Si la logique de tracking n'est pas déjà prête pour les tools,
  l'étendre.
- Durée d'appel Skill 1 peut passer de ~30 s à ~90-120 s avec les
  web_search. Vérifier que le timeout Vercel serverless
  (`maxDuration: 300`) tolère ça.

**Critère de réussite** : lancer un audit de dev avec un client fictif.
Vérifier dans les logs que l'appel Skill 1 contient des tool_use blocks
`web_search` et que le response inclut les résultats récupérés.

**Commit** : `session-2b-bis: step 3 - enable web_search for Skill 1`

---

## Étape 4 — Mise à jour des paramètres max_tokens dans le code

**Fichiers potentiellement à modifier** : `src/lib/ai/anthropic.ts` ou
`src/lib/ai/skills.ts` (selon où les paramètres sont définis)

**Objectif** : aligner les `max_tokens` sur la v2 du YAML.

| Skill                      | v1 (YAML) | Code actuel (d'après PROJECT_STATE) | v2 cible |
|----------------------------|-----------|-------------------------------------|----------|
| 1. Context Builder         | 4000      | 6000                                | **6000** |
| 2. Opportunity Finder      | 8000      | 12000                               | **12000** |
| 3. Risk Analyzer           | 5000      | 8000                                | **8000** |
| 4. Tech Stack Auditor      | 5000      | 8000                                | **8000** |
| 5. Synthesis+ROI+Roadmap   | 10000     | 14000                               | **20000** |

**Changement le plus significatif** : Skill 5 passe de 14000 à 20000
pour absorber les livrables actionnables (ai_prompts_pack à 15 prompts
peut seul peser 3500-4000 tokens).

**Impact coût** : +0,25-0,30 $ US par audit dans le pire cas.
Coût total audit passe approximativement de ~3,50 $ à ~3,80 $ US
(si tous les livrables sont verbeux).

**Aussi à retirer** : tout paramètre `temperature` encore présent dans
le code (Opus 4.7 le rejette — s'il y a encore des `temperature: 0.3`
ou `0.4` qui traînent, les enlever).

**Critère de réussite** : grep sur `temperature` dans `src/lib/ai/` ne
retourne plus aucune occurrence. Les `max_tokens` correspondent au
tableau ci-dessus.

**Commit** : `session-2b-bis: step 4 - bump Skill 5 max_tokens to 20000, remove temperature`

---

## Étape 5 — Corriger "Christian Lavoie" → "Christian Couillard"

**Fichier à modifier** : `CONTEXT_PROJET_AUDIT_IA_5PENNYAI.md`

**Action** : grep du fichier pour `Christian Lavoie`, remplacer par
`Christian Couillard` (d'après PROJECT_STATE, 2 occurrences existent).

**Note** : le closing_notes du Skill 5 corrige déjà cette mention dans
le rapport généré (via le YAML v2). Cette étape concerne uniquement la
documentation du projet.

**Commit** : `session-2b-bis: step 5 - fix Christian's last name in context doc`

---

## Étape 6 — Smoke test : relancer un audit avec le persona Sophie Tremblay

**Objectif** : s'assurer que rien n'est cassé avant de tester le nouveau
persona.

**Actions** :

1. Prendre le formulaire d'intake rempli pour Sophie Tremblay (sauvegardé
   en DB depuis la Session 2B).
2. Relancer un audit complet pour son dossier (ou copier ses
   intake_data dans un nouveau dossier de test).
3. Vérifier que :
   - [ ] Le Skill 1 produit bien les deux nouveaux champs
         (industry_portrait avec 3-5 benchmarks + extracted_client_figures
         avec les chiffres du texte libre).
   - [ ] Le Skill 2 produit quantitative_estimate pour chaque opportunité
         (available, basis, figures, assumptions, confidence).
   - [ ] Le Skill 5 produit consolidated_impact_summary cohérent avec les
         figures du Skill 2.
   - [ ] Le Skill 5 produit 2-4 actionable_deliverables, dont au moins
         un ai_prompts_pack avec 15 prompts spécifiques à la dentisterie.
4. Le closing_notes mentionne bien "Christian Couillard".
5. L'audit se termine en `pending_review` et Christian reçoit le
   courriel de notification.

**Si quelque chose casse** : inspecter les logs (`vercel logs`), vérifier
la réponse JSON de chaque skill, valider manuellement contre
l'output_schema de la v2.

**Commit** : pas de commit à cette étape (test, pas de changement de code).

---

## Étape 7 — Test avec le nouveau persona e-commerce mode

**Objectif** : valider que la v2 tient sur un secteur différent de la
clinique dentaire.

**Persona à créer** : propriétaire d'une boutique e-commerce de mode
avec 20-50 k$ de revenus mensuels.

**Profil suggéré** (à ajuster au besoin) :

- Nom : **Mélanie Dufour**, propriétaire de **Maison Olive** (boutique
  de mode éthique en ligne)
- Secteur : e-commerce, mode féminine, produits écoresponsables
- Localisation : Québec (Montréal)
- Taille : solopreneure + 1 assistante à temps partiel
- Revenus : ~30 k$ CAD/mois, en croissance
- Stack actuel : Shopify, Instagram, Meta Ads, Mailchimp, boîte Gmail
  personnelle
- Tâches chronophages déclarées (proposition de texte pour
  time_consuming_tasks — à ajuster pour inclure des chiffres) :

  > "Je passe environ 10 heures par semaine à répondre aux courriels de
  > service à la clientèle — surtout des questions sur les tailles,
  > les délais de livraison et les retours. Je reçois entre 60 et 80
  > courriels par semaine, et une bonne moitié pose les mêmes
  > questions. En plus, la rédaction de descriptions produits me prend
  > 2-3 heures par nouvelle collection (environ 15-20 nouveaux produits
  > par mois) et je dois aussi créer les posts Instagram qui vont avec,
  > soit 3-5 posts par semaine. Mon panier moyen est d'environ 85 $ et
  > j'estime perdre 10-15 commandes par mois à cause de lenteurs de
  > réponse aux questions avant-achat."

- Défis cochés : réponses lentes, suivi oublié, contenu marketing, admin chronophage
- Budget : 2000-5000 $ CAD
- Horizon : 3-6 mois
- Confort tech : intermédiaire
- Voie préférée : accompagnement hybride (voie B)
- Données sensibles : faibles (données de commande + adresses de
  livraison, pas de santé ni finance)

**Actions** :

1. Créer un nouvel audit via l'interface d'intake avec ces données.
2. Laisser le pipeline complet tourner.
3. Valider manuellement le rapport produit selon les critères ci-dessous.

**Critères de validation du rapport e-commerce** :

- [ ] **Skill 1 — industry_portrait** : 3-5 benchmarks trouvés sur le
      secteur e-commerce mode/retail québécois ou canadien. Sources
      vérifiables (Statistique Canada, BDC, Detail Canada, etc.).
      Pas de chiffres américains si équivalents canadiens existent.
      Narratif intégré, pas juste une liste à puces.
- [ ] **Skill 1 — extracted_client_figures** : capture correctement les
      chiffres du texte libre (10 h/semaine, 60-80 courriels/semaine,
      15-20 produits/mois, 3-5 posts IG/semaine, panier 85 $, 10-15
      commandes perdues/mois). Citations raw_quote fidèles.
- [ ] **Skill 2 — opportunities chiffrées** : 3-5 opportunités avec
      quantitative_estimate exploitant les chiffres du client. Au moins
      une opportunité utilise basis="client_figures", au moins une utilise
      "hybrid" ou "sector_benchmarks".
- [ ] **Skill 2 — ROI en $** : si une opportunité projette des $, les
      hypothèses citent bien le panier moyen de 85 $ du client et
      la fourchette est prudente.
- [ ] **Skill 5 — consolidation** : maximum 3 métriques consolidées, avec
      overlap_note qui explique le recoupement entre opportunités similaires
      (ex: chatbot + automation courriel touchent tous deux le service client).
- [ ] **Skill 5 — livrables actionnables** : 2-4 livrables, dont
      probablement :
  - `ai_prompts_pack` avec 15 prompts spécifiques à l'e-commerce mode
    (descriptions produits, réponses SAV, posts Instagram, suivi retours,
    newsletters saisonnières, etc.), couvrant au moins 5 catégories distinctes.
  - `kpi_tracking_sheet` avec des KPIs concrets (temps réponse SAV,
    taux conversion panier, volume posts IG, etc.) dont certains reprenant
    les chiffres actuels de Mélanie comme baseline.
  - Possiblement `automation_starter_workflow` pour un workflow Shopify
    + Zapier + Mailchimp.
  - Possiblement `vendor_selection_checklist` pour choix d'un outil de
    chatbot ou d'un SAV IA.
- [ ] **Skill 5 — closing_notes** : mentionne "Christian Couillard".
- [ ] **Qualité éditoriale globale** : ton québécois naturel, pas de
      jargon, mention du nom "Maison Olive" et de "Mélanie" dans le
      rapport, pas de généralisation qui pourrait s'appliquer à
      n'importe quelle boutique.

**Coût attendu** : ~3,80-4,20 $ US pour ce test (un peu plus que l'audit
Sophie à cause de web_search et des livrables). À valider via
`/api/admin/costs?days=1`.

**Si des problèmes surviennent** :

- Benchmarks vides ou très pauvres → vérifier que web_search fonctionne
  et que Claude formule des requêtes raisonnables. Peut nécessiter un
  ajustement du prompt Skill 1 (exemples de bonnes requêtes).
- Livrables génériques (prompts "rédige-moi un article de blog" etc.) →
  renforcer les règles de diversité et spécificité dans le prompt Skill 5.
- Consolidation bizarre (gains additionnés naïvement, ou au contraire
  zéro consolidation quand il aurait dû y en avoir) → ajuster le prompt
  Skill 5 section CONSOLIDATION.

**Commit après validation** : `session-2b-bis: step 7 - validated v2 pipeline on e-commerce persona`

---

## Étape 8 — Mettre à jour PROJECT_STATE.md

**Fichier à modifier** : `PROJECT_STATE.md`

**Actions** :

1. Marquer la Session 2B-bis comme complétée dans la section "Où on en est".
2. Mettre à jour la section "Configuration technique actuelle" avec
   les nouveaux `max_tokens` (Skill 5 = 20000).
3. Retirer de "Points de fiction résiduels" :
   - [x] Correction Lavoie → Couillard (fait à l'étape 5)
   - [x] Mise à jour skills-prompts-v1 → v2 (fait à l'étape 2, temperature
         retirée à l'étape 4)
4. Actualiser la section "Prochaine session" pour pointer vers
   la Session 2C (interface admin de révision).
5. Ajouter une note sur le coût audit mis à jour (~3,80 $ US en moyenne)
   et sur la durée (~6-10 minutes au lieu de ~5-8 avant).
6. Dans la liste des sessions complétées, ajouter :
   - ✅ Session 2B-bis — Enrichissement éditorial (Skills 1, 2, 5
     enrichis; livrables actionnables personnalisés; web_search sur
     Skill 1; test validé sur persona e-commerce Maison Olive).

**Commit** : `session-2b-bis: step 8 - update PROJECT_STATE after v2 shipping`

---

## Livrables finaux de la Session 2B-bis

Après cette session, le repo doit contenir :

- [x] `intake-form-v1.yaml` — helper_text et placeholder Q10 bonifiés
- [x] `skills-prompts-v2.yaml` — nouvelle source de vérité des prompts
      (et `skills-prompts-v1.yaml` supprimé si Option A à l'étape 2)
- [x] `src/lib/ai/anthropic.ts` — web_search activé pour Skill 1,
      max_tokens alignés, temperature retirée partout
- [x] `CONTEXT_PROJET_AUDIT_IA_5PENNYAI.md` — nom corrigé
- [x] `PROJECT_STATE.md` — mis à jour post-session
- [x] Audit test validé sur Maison Olive (Mélanie Dufour, e-commerce
      mode)

Pull request ouverte avec le titre :
`Session 2B-bis: enrichissement éditorial (web_search, chiffres client,
livrables actionnables)`

---

## Ce qui n'est PAS dans la Session 2B-bis

Pour éviter toute confusion, ces éléments restent pour plus tard :

- L'interface admin de révision (Session 2C)
- L'export DOCX/PDF (Session 2D)
- Stripe / paiement (Session 2E)
- L'ajout de nouveaux patterns (#006, #007 — Session 3)
- Le Clarifying Agent (jalon v2 après 5-10 audits beta)
- Tout ajout de champ au formulaire d'intake — la décision v2 est
  explicitement "pas de nouveaux champs, on optimise le texte libre"

---

## Si quelque chose tourne mal

- Si un audit échoue en cours de pipeline, vérifier d'abord que le
  prompt Skill en question a bien été mis à jour (grep sur
  `PORTRAIT SECTORIEL`, `ESTIMATION CHIFFRÉE PERSONNALISÉE`,
  `CONSOLIDATION DES GAINS`, `LIVRABLES ACTIONNABLES PERSONNALISÉS`
  dans le YAML chargé).
- Si web_search renvoie une erreur d'API, vérifier que le format du
  paramètre `tools` correspond bien à la doc Anthropic pour le SDK
  utilisé.
- Si le JSON output d'un skill est invalide, inspecter la taille —
  on peut avoir touché la limite `max_tokens` si le modèle a produit
  trop de contenu. Bump au besoin.
- Si les benchmarks sectoriels sont médiocres, ce n'est pas
  nécessairement un bug : certains secteurs sont peu documentés
  publiquement. `search_coverage = "minimal"` est une sortie valide.
- Si Christian Code a des doutes sur une décision, il peut l'indiquer
  explicitement au lieu de deviner — on ajustera ensemble au retour.

---

## Rappels

- **Commit après chaque étape** avec un message clair :
  `session-2b-bis: step N - description`
- **Rollback facile** : si une étape casse quelque chose,
  `git reset --hard HEAD~1` et reprendre.
- **Test systématique** : après chaque étape qui touche au pipeline,
  vérifier qu'un audit minimal peut encore tourner.
- **Pas de régression silencieuse** : si un changement touche un autre
  skill que celui visé (effet de bord), le documenter dans le commit.

---

*Bonne session !*
