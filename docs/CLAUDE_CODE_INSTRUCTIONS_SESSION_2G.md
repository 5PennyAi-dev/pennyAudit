# Instructions Claude Code — Session 2G : Intégration des `implementation_templates` (cas-test pattern 004)

> **Objectif** : intégrer les nouveaux sous-templates d'implémentation
> du pattern 004 (Centris, posts sociaux, newsletters) dans le pipeline,
> adapter le Skill 5 pour les consommer, re-seed le pattern enrichi,
> et valider en bout-en-bout en relançant l'audit de Marie-Pier
> Dubuc avec le pattern 004 enrichi. Cette session est un **cas-test
> ciblé** : si le format prouve sa valeur sur Marie-Pier, on produira
> les implementation_templates des 9 autres patterns dans une session
> ultérieure.
>
> **Durée estimée** : 2-3 heures sur 1 session Claude Code.
>
> **Livrables** : pattern 004 enrichi en DB, prompt Skill 5 mis à
> jour pour consommer les sous-templates, rapport Marie-Pier régénéré
> avec section « Architecture de la solution » intégrant le sous-template
> Centris, comparaison avant/après documentée.

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. `git commit -am "session-2g: start"` pour avoir un point de rollback
3. Donner ce document à Claude Code en contexte initial
4. Procéder **étape par étape**, commit après chaque étape avec un
   message clair (`session-2g: step N - description`)
5. Si une étape échoue, corriger avant de passer à la suivante
6. Si une décision semble ambiguë, demander à Christian au lieu de deviner

---

## Décisions structurantes (déjà tranchées, ne pas re-débattre)

- **Positionnement A.5** : niveau de détail entre voie A self-serve
  pure et voie B accompagnée pure. Le client a l'impression de pouvoir
  faire des choses lui-même sans avoir tout en plug-and-play.
- **Sous-templates intégrés dans le YAML du pattern parent**, pas dans
  un fichier séparé ni une autre table. Cohérence sémantique et
  pipeline simple.
- **3 sous-templates pour le pattern 004** : fiches-centris-immobilier,
  posts-sociaux-blog, newsletters-nurturing. Couvrent les 3 cas
  d'usage majeurs du pattern marketing.
- **Sélection du sous-template par le Skill 5** : matching sur
  `triggers_when` (industry_in + automation_wish_keywords +
  tools_to_recommend) du sous-template vs contexte client.
- **Si plusieurs sous-templates matchent** : prendre celui avec le
  plus de matches. Si aucun ne match : fallback sur le premier
  sous-template avec un avertissement dans `reviewer_notes`.
- **Embedding du pattern enrichi** : le `buildEmbeddingSource` doit
  inclure les `use_case_fr` et keywords des `triggers_when` des
  sous-templates pour enrichir le matching sémantique. Pas le détail
  complet (workflows, pitfalls, etc.) qui noierait le signal.
- **Marie-Pier Dubuc reste le persona de validation primaire** pour
  cette session. Pas besoin de produire un nouveau persona test.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Sessions 2A à 2F livrées et fonctionnelles
- [ ] Marie-Pier Dubuc existe en DB avec un audit `delivered` ou
      `pending_review`
- [ ] Le pattern 004 actuel (`patterns/pattern-004-redaction-contenu-marketing.yaml`)
      est en DB avec son embedding
- [ ] Variables d'environnement présentes : `VOYAGE_API_KEY`,
      `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
- [ ] Christian a fourni le fichier
      `pattern-004-redaction-contenu-marketing-FINAL.yaml` produit
      sur Claude.ai (à déposer dans `incoming-yaml/` à la racine du
      repo avant de commencer)

---

## Étape 0 — Préparer le fichier source

**Objectif** : remplacer le pattern 004 existant par sa version
enrichie avec les 3 sous-templates.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 0 : Mise en place du pattern 004 enrichi

1. Christian va déposer le fichier
   `pattern-004-redaction-contenu-marketing-FINAL.yaml` dans
   `incoming-yaml/` à la racine du repo (à créer si nécessaire).

2. Une fois le fichier déposé :
   a) Valider que c'est du YAML valide (parser avec js-yaml ou
      python yaml.safe_load)
   b) Vérifier qu'il contient bien le champ `implementation_templates`
      avec 3 entrées (fiches-centris-immobilier, posts-sociaux-blog,
      newsletters-nurturing)
   c) Comparer la taille avec le pattern 004 actuel : doit être
      significativement plus volumineux (~2500 lignes vs ~1000 lignes)

3. Faire un backup du pattern 004 actuel :
   cp patterns/pattern-004-redaction-contenu-marketing.yaml \
      patterns/pattern-004-redaction-contenu-marketing.yaml.backup-pre-2g

4. Remplacer le pattern actuel par la version enrichie :
   cp incoming-yaml/pattern-004-redaction-contenu-marketing-FINAL.yaml \
      patterns/pattern-004-redaction-contenu-marketing.yaml

5. Confirmer la mise en place en affichant les premières et dernières
   lignes du fichier remplacé.

6. Ne lance AUCUN seed pour l'instant.
```

**Critère de réussite** :
- Pattern 004 actuel sauvegardé en `.backup-pre-2g`
- Pattern 004 remplacé par la version enrichie (~2500 lignes)
- YAML validé syntaxiquement

---

## Étape 1 — Bonification du `buildEmbeddingSource`

**Objectif** : enrichir le texte embeddé du pattern 004 (et tous
patterns futurs avec sous-templates) pour que le matching sémantique
profite des keywords des sous-templates sans noyer le signal principal.

**Fichier à modifier** : `scripts/seed-patterns.js`

**Manipulation à demander à Claude Code** :

```
ÉTAPE 1 : Bonifier buildEmbeddingSource pour les implementation_templates

1. Ouvre `scripts/seed-patterns.js` et localise la fonction
   `buildEmbeddingSource(pattern)` qu'on a bonifiée à la session 2F.

2. Ajoute une nouvelle section qui exploite les implementation_templates
   si présents dans le pattern. Cette section doit être insérée APRÈS
   la section "OUTILS PRINCIPAUX" et AVANT la troncature finale.

3. Logique à implémenter :

   if (pattern.implementation_templates && pattern.implementation_templates.length > 0) {
     parts.push('CAS D\'USAGE COUVERTS :');
     for (const tmpl of pattern.implementation_templates) {
       // Inclure use_case_fr (description du cas)
       if (tmpl.use_case_fr) {
         parts.push(`- ${tmpl.use_case_fr}`);
       }
       // Inclure les keywords de triggers_when (mots qui doivent matcher)
       if (tmpl.triggers_when?.automation_wish_keywords) {
         parts.push(`  Mots-clés associés : ${tmpl.triggers_when.automation_wish_keywords.join(', ')}`);
       }
       // Inclure les industries cibles si différentes du pattern parent
       if (tmpl.triggers_when?.industry_in) {
         parts.push(`  Industries spécifiques : ${tmpl.triggers_when.industry_in.join(', ')}`);
       }
     }
   }

4. NE PAS inclure : les voie_a_self_serve, voie_b_accompagnee, pitfalls,
   workflow, etc. Ces sections sont trop riches en détails opérationnels
   et noieraient le signal sémantique principal.

5. Garde la limite de 10 000 caractères en sortie (déjà en place
   depuis la session 2F).

6. Affiche le diff de tes modifications.

7. Test rapide : exécute `node scripts/seed-patterns.js --dry-run` si
   un mode dry-run existe, ou lance le script complet et observe les
   logs. La taille de l'embedding source du pattern 004 doit augmenter
   de quelques centaines de caractères (les use_case_fr + keywords des
   3 sous-templates), mais rester sous 10 000.

8. Commit : "session-2g: step 1 - enrich buildEmbeddingSource with
   implementation_templates use cases"
```

**Critère de réussite** :
- La fonction `buildEmbeddingSource` capture les use_case_fr et keywords
  des sous-templates si présents
- Aucune autre partie du script n'est modifiée
- L'embedding source du pattern 004 reste sous 10 000 chars
- Diff affiché et committé proprement

---

## Étape 2 — Re-seed du pattern 004

**Objectif** : mettre à jour le pattern 004 en DB avec son contenu
enrichi (sous-templates inclus dans le JSONB) et son nouvel embedding
calculé sur le texte enrichi.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 2 : Re-seed du pattern 004 enrichi

1. Vérifie que le pattern 004 dans patterns/ est bien la version
   enrichie (avec implementation_templates).

2. Lance le script seed-patterns.js complet :
   npm run seed:patterns

3. Pendant l'exécution, observe les logs spécifiques au pattern 004 :
   - Le nombre de caractères de embedding_source doit avoir augmenté
     vs la session 2F (probablement de quelques centaines à 1000
     caractères de plus)
   - Le pattern 004 doit afficher un statut "✅ Mis à jour" (upsert)
   - Aucune erreur Voyage AI

4. À la fin, vérifie en SQL Supabase :

   SELECT id, title_fr,
          vector_dims(embedding) as dims,
          LENGTH(embedding_source) as source_chars,
          jsonb_array_length(content->'implementation_templates') as nb_templates,
          updated_at
   FROM patterns
   WHERE id = 'ai-marketing-content-creation';

   Doit retourner :
   - dims = 1024
   - source_chars > avant la session 2G (à comparer avec valeur
     précédente)
   - nb_templates = 3
   - updated_at récent

5. Test rapide de cohérence du content JSONB :

   SELECT
     content->'implementation_templates'->0->>'id' as template_1,
     content->'implementation_templates'->1->>'id' as template_2,
     content->'implementation_templates'->2->>'id' as template_3
   FROM patterns
   WHERE id = 'ai-marketing-content-creation';

   Doit retourner :
   - template_1: fiches-centris-immobilier
   - template_2: posts-sociaux-blog
   - template_3: newsletters-nurturing

6. Commit : "session-2g: step 2 - reseed pattern 004 with enriched
   embedding and implementation_templates content"
```

**Critère de réussite** :
- Pattern 004 mis à jour en DB
- 3 sous-templates présents dans le JSONB du content
- Embedding non-null en 1024 dim
- Source chars augmentés vs version pré-2G

---

## Étape 3 — Mise à jour du prompt du Skill 5

**Objectif** : adapter le prompt du Skill 5 pour qu'il consomme les
`implementation_templates` des patterns sélectionnés et les injecte
dans la section « Architecture de la solution » de chaque opportunité.

**Fichier à modifier** : `docs/specs/skills-prompts-v2.yaml` (section
`skill_5_synthesis_roi_roadmap`)

**Manipulation à demander à Claude Code** :

```
ÉTAPE 3 : Adapter le Skill 5 pour consommer les implementation_templates

1. Ouvre `docs/specs/skills-prompts-v2.yaml` et localise la section
   skill_5_synthesis_roi_roadmap.

2. Étudie la structure actuelle du output_schema. Identifie où la
   section "Architecture de la solution" est produite par le Skill 5.

3. Dans le system_prompt du Skill 5, ajoute une nouvelle section
   "INJECTION DES IMPLEMENTATION TEMPLATES" qui décrit la logique
   suivante :

   ╔══════════════════════════════════════════════════════════════╗
   ║ INJECTION DES IMPLEMENTATION TEMPLATES                       ║
   ╠══════════════════════════════════════════════════════════════╣
   ║                                                              ║
   ║ Pour chaque opportunité de la feuille de route, vérifier si  ║
   ║ le pattern source contient une section                       ║
   ║ `implementation_templates` :                                 ║
   ║                                                              ║
   ║ 1. SÉLECTION DU SOUS-TEMPLATE (si plusieurs présents) :      ║
   ║                                                              ║
   ║    Pour chaque sous-template, calculer un score de match :   ║
   ║    - +3 si l'industrie du client est dans                    ║
   ║      triggers_when.industry_in                               ║
   ║    - +2 par mot-clé du                                       ║
   ║      time_consuming_tasks/automation_wish qui apparaît dans  ║
   ║      triggers_when.automation_wish_keywords                  ║
   ║    - +1 si un outil recommandé apparaît dans                 ║
   ║      triggers_when.tools_to_recommend                        ║
   ║                                                              ║
   ║    Sélectionner le sous-template avec le score le plus       ║
   ║    élevé. Si égalité, prendre le premier dans l'ordre du     ║
   ║    YAML. Si tous les scores sont 0 (aucun match), prendre    ║
   ║    le premier sous-template avec un avertissement dans       ║
   ║    reviewer_notes.                                           ║
   ║                                                              ║
   ║ 2. INJECTION DU CONTENU :                                    ║
   ║                                                              ║
   ║    Selon la voie recommandée pour cette opportunité          ║
   ║    (recommended_path) :                                      ║
   ║    - Si voie_a_self_serve : injecter                         ║
   ║      sous_template.voie_a_self_serve                         ║
   ║    - Si voie_b_accompagnee : injecter                        ║
   ║      sous_template.voie_b_accompagnee (qui inclut implicite- ║
   ║      ment le contenu voie_a sauf les sections                ║
   ║      pitfalls/success_criteria)                              ║
   ║                                                              ║
   ║ 3. ADAPTATION CONTEXTUELLE :                                 ║
   ║                                                              ║
   ║    Le contenu des sous-templates contient des marqueurs      ║
   ║    [VOTRE NOM], [VOTRE BANNIÈRE], [ADAPTER : ...].           ║
   ║    Remplacer chaque marqueur par la valeur appropriée du     ║
   ║    contexte client :                                         ║
   ║    - [VOTRE NOM] → first_name + last_name si dispo, sinon    ║
   ║      business_name                                           ║
   ║    - [VOTRE BANNIÈRE] → contexte client si présent (ex:      ║
   ║      RE/MAX du Cartier)                                      ║
   ║    - [ADAPTER : ...] → garder le marqueur si pas de matière  ║
   ║      pour adapter, ou produire une suggestion contextuelle   ║
   ║                                                              ║
   ║ 4. STRUCTURE DE SORTIE ENRICHIE :                            ║
   ║                                                              ║
   ║    Dans le output_schema, chaque opportunité de la feuille   ║
   ║    de route doit maintenant inclure (en plus du contenu      ║
   ║    actuel) :                                                 ║
   ║                                                              ║
   ║    architecture_de_la_solution:                              ║
   ║      sub_template_id: 'string'  # id du sous-template choisi  ║
   ║      sub_template_match_score: integer  # pour traçabilité   ║
   ║      adapted_content: 'string'  # contenu Markdown du sous-  ║
   ║                              # template adapté au contexte   ║
   ║                              # client                        ║
   ║                                                              ║
   ║ 5. SI AUCUN implementation_template DANS LE PATTERN :        ║
   ║                                                              ║
   ║    Conserver le comportement actuel (architecture textuelle  ║
   ║    générée par le Skill 5 sans template injecté). Cela       ║
   ║    permet une transition douce — seul le pattern 004 a des   ║
   ║    sous-templates pour l'instant.                            ║
   ║                                                              ║
   ╚══════════════════════════════════════════════════════════════╝

4. Modifie également le output_schema du Skill 5 pour ajouter le
   champ optionnel architecture_de_la_solution avec les sous-champs
   décrits ci-dessus.

5. Affiche le diff de tes modifications du fichier YAML de spec.

6. Note : ne pas modifier l'implémentation TypeScript du Skill 5
   pour l'instant. La spec YAML est consommée par les modules
   d'exécution du pipeline. La génération de la nouvelle structure
   sera prise en charge automatiquement lors de l'appel suivant si
   l'implémentation lit le system_prompt depuis le YAML.

7. Si l'implémentation TypeScript hardcode des morceaux de prompt
   ou de schéma, IDENTIFIER les fichiers concernés et signaler à
   Christian sans les modifier dans cette étape — c'est l'étape 4.

8. Commit : "session-2g: step 3 - update Skill 5 prompt to consume
   implementation_templates"
```

**Critère de réussite** :
- Le system_prompt du Skill 5 contient les nouvelles instructions
  pour consommer les implementation_templates
- L'output_schema inclut le nouveau champ architecture_de_la_solution
- Aucune autre partie du fichier YAML n'est altérée
- Si l'implémentation TS hardcode des morceaux, Claude Code l'a
  identifié et signalé

---

## Étape 4 — Mise à jour de l'implémentation TypeScript du Skill 5

**Objectif** : si l'implémentation TypeScript du Skill 5 hardcode des
morceaux du prompt ou du schéma, les mettre à jour pour refléter les
changements de l'étape 3.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 4 : Synchroniser l'implémentation TS du Skill 5

1. Identifie le fichier d'implémentation du Skill 5. Probablement
   `api/skill5.ts` ou `src/lib/ai/skills/skill5.ts` ou similaire.

2. Vérifie comment le prompt et le schéma du Skill 5 sont chargés :
   a) Lus dynamiquement depuis docs/specs/skills-prompts-v2.yaml ?
      → Aucune modification à faire ici, étape 4 est sans objet.
   b) Hardcodés en TS dans le fichier ?
      → Mettre à jour avec les modifications de l'étape 3.

3. Si c'est l'option b, applique les mises à jour suivantes :
   - Inclure les nouvelles instructions sur les
     implementation_templates dans le system prompt hardcodé
   - Mettre à jour le schéma Zod ou JSON Schema pour valider
     architecture_de_la_solution dans la structure de réponse
   - Si le schéma Zod existe : ajouter
     architecture_de_la_solution: z.object(...).optional()
   - Tester la compilation : npm run typecheck

4. Affiche le diff.

5. Test rapide : appeler le Skill 5 en isolation avec les outputs
   des skills 1-4 d'un audit existant (Marie-Pier ou autre) et
   vérifier qu'il produit bien un output incluant
   architecture_de_la_solution pour les opportunités basées sur
   le pattern 004.

6. Commit : "session-2g: step 4 - sync TS implementation of Skill 5
   with new implementation_templates logic"
```

**Critère de réussite** :
- Si implémentation TS hardcode : mise à jour cohérente avec étape 3
- npm run typecheck passe
- Test ad-hoc Skill 5 en isolation produit l'output enrichi

---

## Étape 5 — Régénérer l'audit de Marie-Pier Dubuc

**Objectif** : relancer le pipeline complet sur l'audit existant de
Marie-Pier pour générer un nouveau rapport intégrant le sous-template
Centris dans la section « Architecture de la solution ».

**Manipulation à demander à Claude Code** :

```
ÉTAPE 5 : Régénérer le rapport Marie-Pier avec le nouveau format

1. Récupère l'auditId de Marie-Pier Dubuc en SQL :
   SELECT id, status, intake_data->>'first_name' as fn,
          intake_data->>'business_name' as bn
   FROM audits
   WHERE intake_data->>'business_name' ILIKE '%Marie-Pier%'
   ORDER BY created_at DESC
   LIMIT 5;

2. Identifier l'audit le plus récent en status `delivered` ou
   `pending_review`.

3. Si l'admin a un bouton "Relancer le pipeline" pour cet audit :
   l'utiliser. Sinon, déclencher manuellement via l'endpoint
   /api/audit/[id]/rerun ou l'équivalent.

4. Pendant l'exécution :
   - Surveiller les logs SSE pour voir la progression
   - Surveiller particulièrement le Skill 5 — c'est lui qui doit
     produire le nouveau format avec architecture_de_la_solution
   - Si erreur : capturer le message exact et signaler à Christian

5. Une fois le pipeline complet :
   - Vérifier en DB que skill_5_output contient bien
     architecture_de_la_solution pour les opportunités basées sur
     le pattern 004 :

     SELECT skill_5_output->'roadmap'
     FROM audits
     WHERE id = '<audit_id>';

   - Pour chaque opportunité dont le pattern source est
     ai-marketing-content-creation, vérifier la présence de :
     - architecture_de_la_solution.sub_template_id
     - architecture_de_la_solution.adapted_content (Markdown)

6. Si l'audit a une étape de génération de DOCX et de diagrammes
   (sessions 2D et 2E), la laisser s'exécuter.

7. Récupérer le DOCX généré (storage_path dans la table audits)
   et le présenter pour analyse.

8. Commit (s'il y a des fichiers de log à committer) :
   "session-2g: step 5 - regenerate Marie-Pier audit with new
   architecture_de_la_solution"
```

**Critère de réussite** :
- Pipeline complet exécuté sans erreur
- Skill 5 output contient architecture_de_la_solution pour les
  opportunités du pattern 004
- DOCX final régénéré disponible dans Supabase Storage

---

## Étape 6 — Validation manuelle du résultat

**Objectif** : Christian relit le nouveau rapport et compare avec
l'ancien pour valider que le format apporte bien la valeur attendue.

**Manipulation à faire par Christian** (post-Claude Code) :

1. Télécharger le nouveau rapport DOCX depuis Supabase Storage
2. Ouvrir l'ancien rapport
   `audit-marie-pier-lavigne-courtier-immobilier-residentiel-1777235542842.docx`
   pour comparaison
3. Comparer spécifiquement la section « Architecture de la solution
   — Production de fiches Centris en 10 minutes » :

   **Avant (ancien rapport)** : ne contient qu'un en-tête vide ou
   un texte court généré par le Skill 5 sans matière concrète.

   **Après (nouveau rapport)** : doit contenir le contenu structuré
   du sous-template fiches-centris-immobilier adapté au contexte
   Marie-Pier (mention de RE/MAX du Cartier, contexte courtage
   immobilier, OACIQ).

4. Critères de validation :
   - [ ] Le sous-template Centris est bien injecté (et pas posts-sociaux
     ou newsletters)
   - [ ] Les marqueurs [VOTRE NOM] et [VOTRE BANNIÈRE] sont remplacés
     par les valeurs Marie-Pier Dubuc / RE/MAX du Cartier
   - [ ] Le contenu est cohérent avec le ton et la structure du reste
     du rapport
   - [ ] Le client comprend exactement quoi faire pour implémenter
     (test du « principe du recettier expert »)
   - [ ] Le client voit aussi clairement la valeur de l'accompagnement
     5PennyAi (sections « Ce que nous faisons à votre place »,
     « Pièges courants », etc.)

5. Si critères validés : passer à l'Étape 7. Si critères non validés :
   identifier les ajustements nécessaires et soit reprendre une
   étape précédente, soit signaler les besoins de modifications du
   sous-template lui-même.

**Critère de réussite global de la session** :
- Le rapport régénéré démontre clairement la valeur du nouveau format
- Christian valide le « passe ou ne passe pas » pour la production
  des 9 autres patterns

---

## Étape 7 — Documentation et clôture

**Objectif** : capturer les apprentissages de ce cas-test pour guider
la production des 9 autres patterns.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 7 : Documenter les apprentissages

1. Crée un nouveau fichier docs/notes/SESSION_2G_RESULTS.md avec
   les sections suivantes :

   # Résultats Session 2G — Cas-test pattern 004

   ## Verdict global
   [À compléter par Christian après validation]

   ## Métriques techniques
   - Temps total d'exécution du pipeline (avant/après) :
   - Tokens consommés Skill 5 (avant/après) :
   - Taille du rapport final DOCX (avant/après) :

   ## Sous-template sélectionné pour Marie-Pier
   - sub_template_id :
   - sub_template_match_score :
   - Justification du score :

   ## Ce qui a bien fonctionné
   [À compléter]

   ## Ce qui doit être ajusté
   [À compléter]

   ## Implications pour les 9 autres patterns
   [À compléter]

2. Fais un commit final :
   "session-2g: step 7 - document case-test results and lessons
   learned"

3. Suggère à Christian que la prochaine session pourrait être :
   - Session 2H : production des implementation_templates pour les
     patterns 001, 003, 005 (template unique chacun) — patterns
     simples pour valider la généralisation du format hors pattern 004
   - Session 2I : production des implementation_templates pour les
     patterns à sous-templates (002 chatbot, 014 service client)
```

**Critère de réussite** :
- Document de bilan créé et commité
- Christian a une vue claire des prochaines étapes possibles

---

## Pièges fréquents et solutions

- **Le pattern 004 enrichi n'est pas reconnu par le seed** : vérifier
  que la structure du YAML est valide. Lancer un parser strict avant
  le seed. Si certaines valeurs contiennent `:` sans guillemets, les
  encadrer.

- **L'embedding source devient trop long (>10 000)** : la bonification
  de l'étape 1 doit limiter strictement aux use_case_fr et keywords.
  Si on a accidentellement inclus le contenu complet des
  voie_a_self_serve, le revoir.

- **Le Skill 5 ne sélectionne pas le bon sous-template** : vérifier
  que le scoring est bien implémenté. Le sub_template_match_score
  dans l'output doit permettre de débugger.

- **Le contenu du sous-template apparaît dans le rapport mais pas
  adapté** : les marqueurs [VOTRE NOM], [VOTRE BANNIÈRE] doivent
  être substitués. Vérifier que le Skill 5 fait bien cette substitution
  (étape 3 du nouveau bloc INJECTION).

- **Le DOCX builder ne sait pas comment intégrer architecture_de_la_solution** :
  c'est un risque de régression. Si l'ancien builder cherchait juste
  un champ `architecture_text` (string) et que le nouveau format est
  un objet, il faut adapter le builder pour soit lire `adapted_content`
  soit garder une compatibilité ascendante. À traiter dans l'étape 4
  ou plus tard si pas critique.

- **Le rapport régénéré a perdu les diagrammes** : le pipeline de
  diagrammes (Session 2E) doit toujours fonctionner. Si après
  régénération les diagrammes manquent, c'est probablement parce que
  le rerun a écrasé `diagrams_metadata`. Vérifier la procédure de
  rerun.

---

## Ce qui n'est PAS dans cette session

Pour clarté sur le périmètre :

- **Pas de production des implementation_templates pour les 9 autres
  patterns**. C'est volontairement séparé pour valider d'abord le
  format sur le cas-test 004.
- **Pas de modification du Skill 6 (génération de diagrammes)**. Les
  diagrammes restent inchangés dans cette session.
- **Pas de refonte du DOCX builder**. Si une adaptation mineure est
  nécessaire pour intégrer `architecture_de_la_solution.adapted_content`,
  la faire dans l'étape 4. Sinon, traiter dans une session future.
- **Pas de nouveau persona test**. Marie-Pier Dubuc est suffisante
  pour valider ce cas-test.

---

*Document rédigé le 26 avril 2026.*
*Pré-requis : Sessions 2A à 2F livrées et fonctionnelles.*
*Suite logique attendue (selon résultats) : Session 2H pour produire
les implementation_templates des autres patterns.*
