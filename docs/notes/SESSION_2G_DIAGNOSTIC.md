# Diagnostic post-Session 2G — 3 bugs identifiés

**Audit cible** : `5737176f-3048-47ee-bfda-a7b607485b34` (Marie-Pier Lavigne / Dubuc — courtière immobilière résidentielle).
**Date** : 2026-04-27.
**Périmètre** : lecture seule (DB + code). Aucun fichier modifié sauf ce diagnostic.

## Résumé exécutif

Les 3 bugs visibles dans le DOCX ont une **cause racine commune** : le pipeline (Skill 2 → Skill 5 → DOCX) utilise `pattern_id` comme clé d'identification d'opportunité, mais Skill 2 peut produire **plusieurs opportunités basées sur le même pattern** (cas Marie-Pier : 2 opportunités sur `ai-marketing-content-creation`). Sans `opportunity_id` distinct, ces opportunités collisionnent à plusieurs endroits — et chaque acteur du pipeline tente une parade ad-hoc qui aggrave la confusion.

État observé en DB pour Marie-Pier :

| # | pattern_id | adapted_title (Skill 2) |
|---|---|---|
| [0] | `ai-voice-receptionist` | Répondeur intelligent 24/7 pour capter les appels Centris du soir et de la fin de semaine |
| [1] | `ai-marketing-content-creation` | Production de fiches Centris en 10 minutes au lieu de 45-60 minutes, conformes OACIQ |
| [2] | `ai-marketing-content-creation` | Réveil du Excel de 200+ leads tièdes par séquences de nurturing personnalisées |
| [3] | `ai-meeting-transcription-summary` | Transcription des rencontres acheteurs/vendeurs pour ne plus jamais perdre les nuances 3 mois plus tard |

Skill 5 a pris une initiative non spécifiée pour désambiguïser :
- impact_effort_matrix : 4 entrées avec opportunity_id `ai-marketing-content-creation` (= [1] fiches Centris) ET `ai-marketing-content-creation-nurturing` (= [2] réveil leads, slug inventé)
- roadmap : `phase_1_quick_wins.opportunities = ["ai-marketing-content-creation", "ai-meeting-transcription-summary"]` ; `phase_3_long_term.opportunities = ["ai-marketing-content-creation-nurturing"]`
- architectures_de_la_solution : 2 entrées avec les 2 opportunity_id ci-dessus, sub_templates `fiches-centris-immobilier` (score 8) et `newsletters-nurturing` (score 7) — **matching correct côté Skill 5**.

---

## Bug 1 — Confusion opportunités / sections architecture

### Symptôme
Dans la phase 1 (Quick wins) de la « feuille de route », des items « Architecture de la solution — X » apparaissent comme s'ils étaient des opportunités séparées. L'opportunité [1] (Production de fiches Centris) n'apparaît nulle part comme une opportunité formelle.

### Investigation menée
1. SQL : dump des `selected_opportunities` (Skill 2) et de la `roadmap` (Skill 5) — voir tableau ci-dessus.
2. Code : lecture de `buildOpportunityTitleMap` ([src/lib/report/docx-builder.ts:339-349](src/lib/report/docx-builder.ts#L339-L349)) et `titleFor` ([src/lib/report/docx-builder.ts:351-353](src/lib/report/docx-builder.ts#L351-L353)).
3. Code : lecture de `buildRoadmap` ([src/lib/report/docx-builder.ts:670-758](src/lib/report/docx-builder.ts#L670-L758)) qui itère sur `phase.opportunities` et appelle `Bullet(titleFor(id, titleMap))`.

### Source identifiée

**Cause racine — Skill 2 ne fournit pas d'`opportunity_id` distinct par opportunité.** Le schéma `selected_opportunities` ([src/lib/ai/schemas.ts:95-160](src/lib/ai/schemas.ts#L95-L160)) ne contient que `pattern_id` + `adapted_title` + champs descriptifs. Quand Skill 2 produit deux opportunités avec le même `pattern_id`, rien dans le schéma ne distingue formellement les deux.

**Conséquence DOCX — collision dans le titleMap.** [src/lib/report/docx-builder.ts:344-345](src/lib/report/docx-builder.ts#L344-L345) :
```ts
if (opp.pattern_id && opp.adapted_title) {
  map.set(opp.pattern_id, opp.adapted_title);
}
```
Indexer par `pattern_id` fait que la 2e occurrence (`Réveil du Excel`) **écrase** la 1ère (`fiches Centris`). Donc dans `phase_1_quick_wins.opportunities = ["ai-marketing-content-creation", ...]`, le bullet affichera "Réveil du Excel..." au lieu de "Production de fiches Centris...". L'opportunité [1] disparaît visuellement de la roadmap.

**Sur le symptôme exact "Architecture de la solution — X listé comme opportunité"** : non reproductible directement à partir des données DB seules. Ce que la DB explique avec certitude :
- Phase 1 affiche un bullet "Réveil du Excel..." (à cause de la collision Map).
- Phase 3 affiche un bullet "ai-marketing-content-creation-nurturing" (slug brut, voir Bug 2).
- La section H1 « Architecture de la solution » s'insère ENTRE la roadmap et les ROI estimates ([src/lib/report/docx-builder.ts:1215-1216](src/lib/report/docx-builder.ts#L1215-L1216)). Christian peut avoir lu le H1+H2 de cette section comme la suite des bullets de la phase précédente, parce que la structure visuelle du DOCX (H1+H2 alignés à gauche, sans séparateur fort) **mélange** les niveaux. À confirmer en relisant le DOCX avec attention au break visuel.

### Hypothèse de correction
1. **Source** — Skill 2 doit produire un `opportunity_id` unique par opportunité (UUID court ou slug genre `${pattern_id}#1`, `${pattern_id}#2`). Modifier `skill2OutputSchema.selected_opportunities[].opportunity_id` (requis), et mettre à jour le prompt Skill 2.
2. **Aval** — Skill 5 et DOCX builder référencent ce nouvel `opportunity_id` partout au lieu de `pattern_id`. titleMap indexé sur `opportunity_id`.
3. **Migration** — pour les audits déjà persistés, soit on les laisse (legacy), soit on backfill via un script qui infère un `opportunity_id` à partir de l'ordre dans `selected_opportunities`.

### Niveau de confiance
**Élevé** sur la cause racine (collision Map + absence d'opportunity_id distinct). **Moyen** sur l'explication exacte du symptôme visuel "Architecture de la solution listé comme opportunité" — la DB ne montre pas un bullet de roadmap qui contiendrait littéralement "Architecture de la solution — X". Soit interprétation visuelle, soit autre étape du pipeline non identifiée. À investiguer en relisant le DOCX généré section par section avant la Session 2H.

---

## Bug 2 — ID technique qui fuit (`ai-marketing-content-creation-nurturing`)

### Symptôme
Le slug `ai-marketing-content-creation-nurturing` apparaît littéralement dans le DOCX (matrice impact/effort, phase 3, section ROI).

### Investigation menée
1. SQL : confirmé que Skill 5 a inventé cet id custom et l'utilise dans `impact_effort_matrix`, `roi_estimates`, `roadmap.phase_3_long_term.opportunities`, et `architectures_de_la_solution[1].opportunity_id`.
2. Skill 2 ne produit JAMAIS ce slug — il ne sort que `pattern_id` (ai-marketing-content-creation) + `adapted_title`.
3. Code : `titleFor` retombe sur l'id brut quand l'id n'est pas dans le Map ([src/lib/report/docx-builder.ts:352](src/lib/report/docx-builder.ts#L352)) :
```ts
return titleMap.get(id) ?? id;
```
4. titleMap (peuplé depuis Skill 2) ne contient que `ai-voice-receptionist`, `ai-marketing-content-creation`, `ai-meeting-transcription-summary` — pas le slug custom inventé par Skill 5.

### Source identifiée

**Cause racine — Skill 5 prend l'initiative de désambiguïser sans contrat formel.** Voyant deux opportunités avec `pattern_id=ai-marketing-content-creation`, il en garde une avec ce pattern_id et invente `${pattern_id}-nurturing` pour l'autre. Cette initiative est spontanée, **non prévue par la spec ni par le prompt** ([src/prompts/skill-5.md](src/prompts/skill-5.md)) — elle n'est documentée nulle part.

**Conséquence DOCX — fallback à l'id brut.** Le slug n'est dans aucun titleMap, donc `titleFor` retourne le slug tel quel. Les sections impact_effort_matrix ([src/lib/report/docx-builder.ts:586](src/lib/report/docx-builder.ts#L586)), roadmap ([src/lib/report/docx-builder.ts:704](src/lib/report/docx-builder.ts#L704)), architectures ([src/lib/report/docx-builder.ts:822](src/lib/report/docx-builder.ts#L822)), ROI ([src/lib/report/docx-builder.ts:848](src/lib/report/docx-builder.ts#L848)) affichent le slug brut.

### Hypothèse de correction
Identique à Bug 1 — **résoudre à la source** : Skill 2 émet `opportunity_id` distincts. Skill 5 ne désambiguïse plus rien : il consomme les `opportunity_id` reçus tels quels. titleMap indexe sur `opportunity_id`.

Garde-fou défensif côté DOCX : si après la correction Skill 5 invente quand même un id absent du Map, `titleFor` pourrait fallback sur le adapted_title de l'opportunité dont le pattern_id est le préfixe, plutôt que sur le slug brut. Mais c'est un patch — pas une vraie solution.

### Niveau de confiance
**Élevé** — chaque pas du raisonnement est observable en DB et en code, sans incertitude.

---

## Bug 3 — Sous-template Centris injecté dans l'opportunité « Réveil du Excel »

### Symptôme
Sous l'en-tête « Architecture — Fiches Centris en 10-15 minutes » qui suit visuellement l'opportunité « Réveil du Excel », c'est le contenu de `fiches-centris-immobilier` qui apparaît au lieu de `newsletters-nurturing`.

### Investigation menée
1. SQL : `architectures_de_la_solution` contient bien deux entrées :
   - `[0]` opportunity_id=`ai-marketing-content-creation`, sub_template_id=`fiches-centris-immobilier`, score=8 — adapted_content commence par `## Architecture — Fiches Centris en 10-15 minutes`
   - `[1]` opportunity_id=`ai-marketing-content-creation-nurturing`, sub_template_id=`newsletters-nurturing`, score=7 — adapted_content commence par `## Architecture — Réveil des 200+ leads tièdes`
2. **Le matching est correct côté Skill 5** : fiches Centris pour [1], nurturing pour [2] — exactement ce qui était attendu.
3. Code DOCX : `buildArchitecturesDeLaSolution` ([src/lib/report/docx-builder.ts:809-836](src/lib/report/docx-builder.ts#L809-L836)) fait `H2(titleFor(a.opportunity_id, titleMap))` puis injecte le adapted_content.
4. titleMap pour `ai-marketing-content-creation` → "Réveil du Excel..." (Map écrasé par Bug 1).
5. titleMap pour `ai-marketing-content-creation-nurturing` → absent → fallback à l'id brut (Bug 2).

### Source identifiée

**Le bug n'est PAS dans le matching Skill 5 — il est dans le rendu DOCX.** Conséquence directe et exacte du Bug 1 :

| Architecture entry | opportunity_id | sub_template injecté (correct) | Titre H2 affiché (faux) |
|---|---|---|---|
| [0] | ai-marketing-content-creation | fiches-centris-immobilier ✓ | "Réveil du Excel..." (collision Map) |
| [1] | ai-marketing-content-creation-nurturing | newsletters-nurturing ✓ | "ai-marketing-content-creation-nurturing" (slug brut) |

Le client voit le contenu fiches Centris **sous le titre Réveil du Excel** parce que les deux opportunités du pattern 004 partagent la même clé de résolution dans le Map, et la 2e a écrasé la 1re. Skill 5 a fait son travail de matching correctement, mais le DOCX builder annule le bénéfice en confondant les titres.

### Hypothèse de correction
Aucune correction propre tant que Bug 1 n'est pas réglé. Une fois `opportunity_id` distincts en place :
- Skill 5 produit `architectures_de_la_solution[i].opportunity_id` aligné sur ces ids
- DOCX résout chaque architecture vers le bon titre via le Map non-collisionnant
- Le matching Skill 5 (déjà correct) sera correctement reflété visuellement

### Niveau de confiance
**Élevé** — observable en DB, le mismatch est purement visuel, le diagnostic se déduit mécaniquement de Bug 1.

---

## Bugs supplémentaires identifiés

### Bonus 1 — Incohérence onomastique Lavigne / Dubuc

`intake_data.first_name = "Marie-Pier Dubuc"`, `intake_data.business_name = "Marie-Pier Lavigne — Courtier immobilier résidentiel"`. Skill 5 l'a noté dans `reviewer_notes`. **Hors scope pipeline** — c'est un problème de saisie/validation du formulaire d'intake, pas du matching IA. À traiter séparément (ajouter une validation de cohérence first_name/business_name dans le formulaire, ou flag admin si écart détecté).

### Bonus 2 — Skill 2 ne distingue pas formellement les opportunités multiples sur un même pattern

Spec Skill 2 ([docs/specs/skills-prompts-v2.yaml](docs/specs/skills-prompts-v2.yaml)) ne mentionne jamais le cas « plusieurs opportunités sur le même pattern ». Le prompt ([src/prompts/skill-2.md](src/prompts/skill-2.md)) probablement non plus (à vérifier). La possibilité existe (Skill 2 sait découper un pattern riche en opportunités plus fines), mais elle n'est pas formalisée. Tant qu'elle ne l'est pas, le pipeline downstream restera fragile.

---

## Recommandations pour la Session 2H

Ordre de priorité (le 1er débloque les 2 autres) :

### P0 — Introduire `opportunity_id` formel dans Skill 2 (bloquant)
- **Effort** : moyen-élevé — touche schéma Zod, type TS, prompt Skill 2 (spec YAML + skill-2.md), prompt Skill 5 (référencer opportunity_id partout), DOCX builder.
- **Décision à prendre** : format de l'id (UUID court, slug `${pattern_id}#1`, ou simple index). Recommandation : slug lisible `${pattern_id}--${kebab-case-court-de-l'angle}` (ex `ai-marketing-content-creation--fiches-centris`, `ai-marketing-content-creation--reveil-leads`). Avantage : reste lisible si jamais il fuite encore quelque part. Inconvénient : Skill 2 doit le produire correctement.
- **Migration** : audits historiques restent legacy, le DOCX builder doit tolérer les deux formats (avec ou sans opportunity_id) le temps que tous les audits soient régénérés.

### P1 — Clarifier la spec multi-opportunités d'un même pattern (formalisation)
- **Effort** : faible — uniquement texte/prompt.
- Documenter explicitement dans Skill 2 que plusieurs opportunités peuvent partager un `pattern_id` quand le pattern couvre plusieurs angles (cas pattern 004 : fiches, posts, newsletters). Ajouter dans le prompt Skill 2 : « si tu produis plusieurs opportunités sur un même pattern, donne-leur des opportunity_id distincts et des adapted_title clairement différenciés ».
- À faire AVANT d'attaquer les 9 autres patterns, car les patterns 002 (chatbot) et 014 (service client) ont aussi vocation à donner plusieurs opportunités.

### P2 — DOCX builder : `titleFor` plus défensif
- **Effort** : très faible.
- Si `id` introuvable dans le Map, log un warning serveur pour qu'on voie passer ce cas. Ne rien afficher de pire que ce qu'on a déjà — éventuellement « (titre manquant) » plutôt qu'un slug brut.

### P3 — Garde-fou Skill 5 : interdire l'invention d'opportunity_id
- **Effort** : faible (prompt).
- Compléter le prompt Skill 5 : « tu ne fabriques JAMAIS un opportunity_id ; tu utilises ceux fournis dans selected_opportunities. Si deux opportunités y ont le même id, c'est un bug en amont — note-le dans reviewer_notes et n'invente pas de slug. »

### P4 (optionnel) — Validation formulaire intake : cohérence first_name / business_name
Hors scope 2H mais à mettre dans le backlog. Détecter et flagger les incohérences au moment de la saisie ou en revue admin.

---

## Risques et zones d'incertitude

1. **Symptôme exact « Architecture de la solution — X listé comme opportunité »** — non reproductible à 100 % à partir des données DB. Soit interprétation visuelle (H2 lu comme un bullet), soit étape du pipeline non couverte par cette investigation. **Action recommandée** : avant de lancer Session 2H, relire le DOCX section par section en notant précisément les niveaux de titres (H1/H2/H3) et marges visuelles.

2. **Backward compatibility des audits déjà persistés** — toucher à `selected_opportunities[].opportunity_id` casse les audits historiques si leur DOCX est régénéré sans migration. **Décision à prendre** : régénérer tous les audits affectés (re-rerun cher), ou laisser le DOCX builder tolérer les deux formats (plus de complexité long-terme).

3. **Scoring du sous-template — risque pour les 9 autres patterns** — Marie-Pier a deux opportunités sur le pattern 004 et le scoring a fonctionné parce que les deux sous-templates avaient des keywords distincts (`fiche/centris/listing` vs `nurturing/leads tièdes`). Pour les patterns dont les sous-templates ont des keywords proches (à venir : pattern 002 chatbot avec ses variantes service client / commerce / RH), le scoring `+2 par keyword` peut donner des égalités ou des matches faibles. À surveiller au moment de produire ces patterns.

4. **Map collision sur d'autres types de patterns** — le bug 1 racine (collision sur pattern_id) ne se manifeste que pour Marie-Pier parce qu'elle a 2 opportunités sur le même pattern. Les audits avec 1 opportunité par pattern ne le déclenchent pas. Donc d'autres audits historiques peuvent paraître OK alors qu'ils sont sur le même code défaillant. La correction P0 est néanmoins nécessaire car les patterns multi-angle vont devenir la norme avec les implementation_templates.

5. **Schéma Skill 5 et architectures_de_la_solution** — actuellement le champ `opportunity_id` accepte n'importe quel string. Après P0, il faudrait idéalement valider avec un `.refine()` Zod que la valeur correspond à un opportunity_id présent dans selected_opportunities. Renforcement schéma à inclure dans 2H ou plus tard.
