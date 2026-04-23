# Instructions Claude Code — Session 2B : Pipeline des 5 skills

> **Objectif** : Implémenter le pipeline d'audit IA complet : les 5 skills
> en fonctions serverless Vercel, l'orchestration via `/api/audit/run` avec
> SSE, l'écran de progression client, le matching sémantique via pgvector
> et Voyage AI, et les 2 courriels de fin de parcours.
>
> **Durée estimée** : 4-6 heures en session Claude Code
>
> **Livrables** : Un utilisateur qui clique "Lancer mon audit" à la fin de
> la Session 2A voit un écran de progression en temps réel, les 5 skills
> s'exécutent, un rapport complet est persisté en DB, Christian reçoit une
> notification de revue, le client reçoit une confirmation.

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. Vérifier que la Session 2A est complètement commitée et testée
3. Faire un nouveau commit de référence : `git commit --allow-empty -m "session-2b: start"`
4. Donner ce document à Claude Code en contexte initial
5. Procéder **étape par étape**, commit après chaque étape
6. Ne pas sauter d'étapes. Si une étape échoue, corriger avant de passer à la suivante.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Session 2A complétée : formulaire 7 écrans fonctionnel, persistence OK
- [ ] Un enregistrement `audits` avec `status='draft'` peut être créé via le formulaire
- [ ] Les 5 patterns existants sont seedés dans la table `patterns`
- [ ] Variables d'environnement disponibles :
  - `ANTHROPIC_API_KEY`
  - `VOYAGE_API_KEY`
  - `RESEND_API_KEY`
  - `CRON_SECRET` (déjà en place de 2A)
  - `ADMIN_EMAIL` (à ajouter : adresse de Christian Couillard pour les notifications)
  - `ADMIN_NAME` (à ajouter : "Christian Couillard")
- [ ] La colonne `embedding` sur la table `patterns` est de type VECTOR(1024) pour Voyage-3

---

## Contexte à charger

Avant de commencer, Claude Code doit lire dans l'ordre :

1. `docs/CONTEXT_PROJET_AUDIT_IA_5PENNYAI.md` — vision globale du projet
2. `docs/specs/skills-prompts-v1.yaml` — **spec complète des 5 skills** (source de vérité)
3. `docs/specs/intake-form-v1.yaml` — référence des field_id utilisés par les skills
4. Les 5 fichiers YAML de patterns (`pattern-001` à `pattern-005`) dans le repo
5. Le schéma Supabase actuel (tables `clients`, `audits`, `patterns`)

---

## Décisions de produit à respecter (non-négociables)

**Modèle IA** : `claude-opus-4-7` pour les 5 skills (config centralisée dans un seul fichier pour changement facile plus tard).

**Écran de progression** : minimaliste, avec un texte explicite mentionnant
la revue humaine de 48h et l'option de fermer l'onglet.

**Interface admin de révision** : **PAS dans cette session**. Elle sera
produite en Session 2C. Pour l'instant, Christian révisera les audits
directement dans Supabase SQL Editor.

---

## Étape 1 — Config centralisée de l'API Anthropic et Voyage

**Objectif** : Wrappers réutilisables pour appeler Anthropic et Voyage proprement.

**Fichiers à créer** :

- `src/lib/ai/anthropic.ts`
  - Helper `callClaudeJSON({ systemPrompt, userInput, maxTokens, temperature })`
  - Utilise `@anthropic-ai/sdk`
  - Modèle par défaut : `claude-opus-4-7`
  - Gestion stricte du JSON : si la réponse ne parse pas, retry une fois avec temperature abaissée de 0.1
  - Si 2 échecs consécutifs de parsing JSON : throw une erreur typée `InvalidJsonResponseError`
  - Retourne un objet typé : `{ parsedJson, rawResponse, tokensUsed, model }`

- `src/lib/ai/voyage.ts`
  - Helper `generateEmbedding(text: string)` via l'API Voyage
  - Modèle : `voyage-3`, dimensions 1024
  - Retourne `number[]` (array de 1024 floats)
  - Gestion des erreurs réseau avec 1 retry

- `src/lib/ai/config.ts`
  - Exporte `SKILL_MODEL_CONFIG` : map des skills 1-5 vers leurs paramètres
    (modèle, temperature, max_tokens) depuis le YAML
  - Centralisé pour faciliter les ajustements futurs

**Critère de réussite** : Tu peux créer un script test local qui appelle
`callClaudeJSON` avec un prompt simple et reçoit un JSON valide. Même chose
pour `generateEmbedding`.

---

## Étape 2 — Types TypeScript des 5 skills

**Objectif** : Typer rigoureusement les input/output de chaque skill pour
éviter les erreurs de contrat entre skills.

**Fichier à créer** : `src/types/skills.ts`

**À inclure** :
- Type `Skill1Input` et `Skill1Output` (reflétant exactement le `output_schema` du YAML)
- Idem pour Skills 2, 3, 4, 5
- Type `AuditPipelineState` qui combine tous les outputs intermédiaires
- Type `SSEEvent` pour les événements streaming (skill_1_started, skill_1_completed, etc.)
- Enums pour les valeurs contraintes (ex : `RecommendedPath`, `SeverityLevel`, `Quadrant`)

**Critère de réussite** : `npm run typecheck` passe. Les types reflètent
fidèlement le YAML sans écart.

---

## Étape 3 — Skill 1 (Context Builder) en fonction serverless

**Objectif** : Première fonction Vercel serverless, sert de template pour les 4 autres.

**Fichier à créer** : `api/skills/skill-1-context-builder.ts`

**Logique** :
1. Parse le body POST : `{ intakeData: IntakeFormData }`
2. Valide avec Zod (schema dérivé de `Skill1Input`)
3. Charge le prompt système depuis `docs/specs/skills-prompts-v1.yaml` (ou version extraite dans `src/prompts/skill-1-system.md`)
4. Appelle `callClaudeJSON()` avec :
   - systemPrompt = le prompt du skill 1
   - userInput = JSON stringifié des `intakeData`
   - maxTokens = 4000
   - temperature = 0.3
5. Valide la réponse JSON avec un schéma Zod basé sur `Skill1Output`
6. Retourne la réponse avec metadata : `{ output, tokensUsed, durationMs }`

**À créer aussi** : `src/prompts/` — dossier qui contient les 5 prompts
systèmes extraits du YAML en fichiers markdown individuels. Chargés à
runtime par les fonctions skill. Le YAML reste la source de vérité
canonique, les .md sont la version runtime.

**Critère de réussite** :
- Tu peux appeler cette fonction avec un `intakeData` de test et obtenir un
  `Skill1Output` valide
- La validation Zod rejette correctement un input malformé
- Si Claude retourne un JSON invalide, le retry se déclenche

---

## Étape 4 — Skills 2 à 5 en fonctions serverless

**Objectif** : Dupliquer le pattern du skill 1 pour les 4 autres, avec
leurs spécificités respectives.

**Fichiers à créer** :
- `api/skills/skill-2-opportunity-finder.ts`
- `api/skills/skill-3-risk-analyzer.ts`
- `api/skills/skill-4-tech-stack-auditor.ts`
- `api/skills/skill-5-synthesis-roi-roadmap.ts`

**Spécificités à respecter** :

- **Skill 2** : reçoit `context` (output skill 1) + `candidatePatterns` (array
  de 12 patterns avec leur score de similarité). Max tokens = 8000.

- **Skill 3** : reçoit `context` + `selectedOpportunities` + `patternsRiskData`
  (champ `risks` extrait des patterns utilisés). Attention à la section
  obligatoire `loi_25_applicability` quand `primary_location = 'quebec'`.

- **Skill 4** : reçoit `context` + `selectedOpportunities` + `patternsPrereqData`
  (champ `prerequisites` des patterns). Max tokens = 5000.

- **Skill 5** : reçoit les outputs des 4 skills précédents. Max tokens = 10000.
  C'est le skill le plus lourd en tokens, attention aux timeouts Vercel.

**À factoriser** :
- Un helper commun `runSkill(skillId, input, promptPath)` qui encapsule la
  logique répétitive (validation, appel Claude, parsing, retry)
- Les 5 fonctions deviennent des thin wrappers autour de ce helper

**Critère de réussite** : Chaque skill est appelable en isolation avec un
input de test et retourne un output valide. Les tests manuels via curl
ou Thunder Client fonctionnent pour les 5.

---

## Étape 5 — Embedding des patterns existants (script one-off)

**Objectif** : Générer les embeddings Voyage-3 pour les 5 patterns actuels.
Ce script tourne une fois, puis à chaque ajout de pattern futur.

**Fichier à créer** : `scripts/generate-pattern-embeddings.ts`

**Logique** :
1. Lit tous les fichiers YAML dans `patterns/`
2. Pour chaque pattern :
   - Construit un texte à embedder : concaténation de `summary_long` +
     `pain_point` + `target_industries` + `tags` (le texte qui doit matcher
     avec ce que le client écrit dans `time_consuming_tasks`)
   - Appelle `generateEmbedding()` via Voyage
   - UPDATE la row `patterns` en DB avec le nouvel embedding
3. Logge le résultat pattern par pattern

**Commande à ajouter dans `package.json`** :
```json
"scripts": {
  "embeddings:generate": "tsx scripts/generate-pattern-embeddings.ts"
}
```

**Critère de réussite** :
- Tu lances `npm run embeddings:generate`
- Les 5 patterns ont leur champ `embedding` non-null en DB
- Une requête manuelle SQL `SELECT id, embedding IS NOT NULL FROM patterns;`
  retourne `true` pour les 5 rows

---

## Étape 6 — Matching sémantique (recherche pgvector)

**Objectif** : Fonction qui prend un texte d'intake, génère son embedding,
et retourne les top-K patterns par similarité cosinus.

**Fichier à créer** : `src/lib/ai/semantic-matching.ts`

**Logique** :
1. Fonction `findTopKPatterns({ queryText, k = 12, minPatternsAvailable = 5 })`
2. Génère l'embedding du `queryText` via Voyage
3. Requête Supabase avec pgvector :
   ```sql
   SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
   FROM patterns
   ORDER BY embedding <=> $1::vector
   LIMIT $2;
   ```
4. K dynamique : `actualK = Math.min(k, totalPatternsCount)` — évite de
   demander plus de patterns qu'il n'en existe
5. Retourne un array `{ patternId, content, similarityScore }` trié par
   similarité décroissante

**Construction du `queryText`** :
- Concaténation de : `industry` + `time_consuming_tasks` + `automation_wish`
- Ces trois champs représentent le mieux "ce que le client veut résoudre"

**Critère de réussite** :
- Tu peux appeler cette fonction avec un queryText de test
- Elle retourne 5 patterns (puisqu'on en a 5) triés par similarité
- Les scores de similarité sont entre 0 et 1 (cosinus normalisé)

---

## Étape 7 — Orchestrateur `/api/audit/run` avec SSE

**Objectif** : Le endpoint principal qui enchaîne les 5 skills et streame
le progrès au client via Server-Sent Events.

**Fichier à créer** : `api/audit/run.ts`

**Architecture** :

Important : Vercel serverless a une limite de 10 secondes en plan Hobby,
60 secondes en plan Pro. Le pipeline complet dépasse ces limites. Il faut
donc utiliser **Vercel Edge Functions** (streaming SSE natif, pas de limite
de durée stricte) ou **Vercel Background Functions**.

**Approche recommandée : Edge Function avec SSE**

```typescript
export const config = { runtime: 'edge' };
```

**Flux d'exécution** :

1. Reçoit POST `{ auditId }`
2. Charge `audits` depuis Supabase via l'auditId → récupère `intake_data`
3. Transitionne `audits.status` de `draft` à `running`
4. Ouvre un stream SSE et envoie :
   - `event: pipeline_started`
5. **Skill 1** :
   - `event: skill_1_started` (data: { skillName: 'Analyse du contexte' })
   - Appelle l'API Skill 1 en interne (fetch local)
   - Persiste le résultat dans `audits.skill_1_output`
   - `event: skill_1_completed`
6. **Matching sémantique** :
   - `event: matching_started` (data: { message: 'Recherche d\'opportunités' })
   - Utilise `findTopKPatterns()` avec un queryText construit depuis
     skill_1_output + champs pertinents de intake_data
   - Garde les 12 patterns candidats en mémoire
7. **Skill 2** :
   - `event: skill_2_started` (data: { skillName: 'Identification des opportunités' })
   - Appelle l'API Skill 2 avec context + candidatePatterns
   - Persiste dans `audits.skill_2_output`
   - `event: skill_2_completed`
8. **Skills 3 et 4 en parallèle** :
   - `event: skills_3_4_started`
   - Lance Skill 3 et Skill 4 via `Promise.all()`
   - Extrait du contenu des patterns sélectionnés les données nécessaires
     (risks pour Skill 3, prerequisites pour Skill 4)
   - Persiste dans `audits.skill_3_output` et `audits.skill_4_output`
   - `event: skills_3_4_completed`
9. **Skill 5** :
   - `event: skill_5_started` (data: { skillName: 'Rédaction du rapport final' })
   - Appelle l'API Skill 5 avec tous les outputs précédents
   - Persiste dans `audits.skill_5_output`
   - `event: skill_5_completed`
10. **Finalisation** :
    - Transitionne `audits.status` de `running` à `pending_review`
    - Set `audits.pipeline_completed_at = NOW()`
    - `event: pipeline_completed` (data: { auditId, message: 'Audit terminé, en attente de révision' })
11. **Déclenche en background** (pas d'await, fire-and-forget) :
    - Envoi courriel confirmation au client
    - Envoi courriel notification à Christian

**Gestion d'erreur** :
- Si un skill échoue, `event: pipeline_error` avec détails
- Transitionne `audits.status` à `error`
- Notifier Christian avec un courriel "Un audit a échoué"
- Le client reçoit un courriel d'excuse + promesse de reprise manuelle

**Critère de réussite** :
- Tu peux déclencher le pipeline avec curl et voir les événements SSE
  arriver dans le bon ordre
- Après succès, la row `audits` contient les 5 outputs et status =
  'pending_review'
- Durée totale observée : 3-8 minutes selon la longueur des réponses

---

## Étape 8 — Écran de progression côté client

**Objectif** : UI React qui consomme le SSE et affiche l'état au client.

**Fichiers à créer** :
- `src/pages/audit/AuditProgress.tsx` — la page
- `src/hooks/useAuditProgress.ts` — hook qui gère la connexion SSE
- `src/components/audit/PipelineStep.tsx` — composant d'un step visuel

**Design de la page** (minimaliste + texte 48h honnête) :

Section haut de page :
- Titre : "Votre audit est en cours de production"
- Sous-titre : "Prenez une pause, on s'occupe du reste"

Section centrale — Timeline verticale des étapes :
- Étape 1 : "Analyse de votre contexte"
- Étape 2 : "Identification des opportunités"
- Étape 3 : "Évaluation des risques et de votre stack"
  (affiché comme une seule étape au client bien que techniquement parallèle)
- Étape 4 : "Rédaction de votre rapport personnalisé"

Chaque étape a 3 états visuels :
- **En attente** : cercle gris, texte gris, icône sobriété
- **En cours** : cercle Orange 500 pulsant, texte Navy 600, spinner discret
- **Terminée** : cercle vert avec check, texte Navy 600

Section basse — Cadre d'honnêteté (important) :

```
Prochaine étape : révision par Christian Couillard

Une fois la production terminée, votre rapport entrera en phase de
révision humaine (maximum 48 heures ouvrables). Vous recevrez le
rapport final par courriel à [email du client].

Vous pouvez fermer cet onglet sans perdre votre progression.
```

À la toute fin (quand `pipeline_completed`) :
- Check vert grand format
- Titre : "Votre audit est prêt pour révision"
- Texte : "Christian révisera votre rapport dans les 48 prochaines heures ouvrables et vous l'enverra par courriel. Vous pouvez maintenant fermer cet onglet."
- Pas de bouton "voir mon audit" — le rapport n'est pas encore accessible au client tant que Christian ne l'a pas approuvé.

**Gestion des erreurs dans l'UI** :
- Si `pipeline_error` reçu : afficher un message chaleureux qui invite à
  recontacter Christian directement. Pas de détails techniques au client.
  ("Une erreur technique s'est produite. Christian a été notifié et vous
  recontactera personnellement sous peu.")

**Route à ajouter** : `/audit/progress/:auditId`

**Modification du bouton "Lancer mon audit"** de l'écran 7 du formulaire
(Session 2A) :
- Au clic : POST `/api/audit/run` avec l'auditId
- Redirection immédiate vers `/audit/progress/:auditId`

**Critère de réussite** :
- Au clic sur "Lancer mon audit" depuis le formulaire, tu atterris sur la
  page de progression
- Les 4 étapes visuelles progressent en temps réel
- À la fin, l'écran final avec le message 48h s'affiche
- Fermer l'onglet pendant le pipeline ne casse rien (le backend continue)

---

## Étape 9 — Courriels de fin de parcours

**Objectif** : Les deux courriels envoyés après `pipeline_completed`.

**Fichiers à créer** :
- `src/lib/email/audit-submitted-client.ts` — template courriel client
- `src/lib/email/audit-pending-review-admin.ts` — template courriel Christian
- `api/audit/send-completion-emails.ts` — endpoint appelé par l'orchestrateur

**Courriel 1 — au client** :

- Sujet : "[5PennyAi] Votre audit est en production"
- Expéditeur : `christian@5pennyai.com` (ou équivalent, à vérifier dans la
  config Resend existante de Session 2A)
- Corps (HTML simple, ton chaleureux) :

```
Bonjour [first_name],

Merci d'avoir rempli votre audit IA. Votre rapport personnalisé
est maintenant en phase de révision humaine.

Je vais personnellement revoir chaque section du rapport pour
m'assurer qu'il est de qualité et adapté à votre situation.
Vous le recevrez par courriel dans les 48 heures ouvrables.

En attendant, si vous avez des questions ou un contexte
supplémentaire à partager, répondez simplement à ce courriel.

Au plaisir,
Christian Couillard
Fondateur, 5PennyAi
```

**Courriel 2 — à Christian (ADMIN_EMAIL)** :

- Sujet : "[5PennyAi Admin] Nouvel audit à réviser — [business_name]"
- Expéditeur : `noreply@5pennyai.com`
- Corps (HTML, dense en info) :

```
Nouvel audit en attente de révision

Client : [business_name] ([first_name], [email])
Secteur : [industry]
Taille : [company_size]
Localisation : [primary_location]
Budget : [budget_range]
Voie préférée : [preferred_approach]

Audit ID : [audit_id]
Complété à : [pipeline_completed_at]
Délai SLA : 48 heures ouvrables (avant [SLA_deadline])

Aperçu rapide :
— Niveau de confiance global (skill 5) : [confidence_level]
— Nombre d'opportunités sélectionnées : [N]
— Niveau de risque global : [overall_risk_level]
— Voie recommandée : [recommended_path]

Pour réviser :
[lien vers Supabase SQL Editor ou futur /admin/audits/[audit_id]]

Note : en attendant la Session 2C, la révision se fait via Supabase
SQL Editor. Query suggérée :
SELECT skill_1_output, skill_2_output, skill_3_output,
       skill_4_output, skill_5_output
FROM audits WHERE id = '[audit_id]';
```

**Gestion du délai SLA 48h ouvrables** :
- Calcul : `pipeline_completed_at + 48h hors weekends`
- Helper utilitaire `src/lib/dates/businessHours.ts` qui fait ce calcul
- Utilisé pour afficher la deadline dans le courriel admin

**Critère de réussite** :
- Après un pipeline complet, les deux courriels partent
- Le courriel client a le bon prénom et le bon ton
- Le courriel admin contient les infos clés pour amorcer la révision
- En dev (RESEND_API_KEY absente), les deux courriels sont loggés dans
  la console avec leur contenu complet (fallback dev de Session 2A)

---

## Étape 10 — Test bout-en-bout et nettoyage

**Objectif** : Valider le flux complet de l'utilisateur qui démarre son
audit jusqu'à l'envoi des deux courriels.

**Scénario de test** :

1. Démarre l'app en local (`npm run dev` + `vercel dev` ou équivalent pour
   les fonctions serverless)
2. Va sur `/intake`
3. Remplis les 19 questions avec des réponses réalistes pour une
   entreprise fictive (ex : clinique dentaire à Québec, 8 employés, B2C,
   budget 2k-5k, voie B)
4. Clique "Lancer mon audit" à l'écran 7
5. Observe l'écran de progression :
   - Les 4 étapes progressent dans l'ordre
   - La timeline visuelle est correcte
   - Le cadre d'honnêteté 48h est lisible
6. Attends la fin (3-8 min)
7. Vérifie l'écran final :
   - Message "Votre audit est prêt pour révision"
   - Pas de bouton "voir l'audit"
8. Vérifie dans la console (fallback dev) ou dans Resend les deux courriels :
   - Courriel client : ton chaleureux, 48h mentionnées
   - Courriel admin : informations clés, audit_id, query SQL utile
9. Vérifie dans Supabase la row `audits` :
   - `status = 'pending_review'`
   - Les 5 `skill_N_output` sont remplis avec du JSON valide
   - `pipeline_completed_at` est rempli

**Test du cas d'erreur** :
1. Simule un échec (ex : désactive temporairement la clé Anthropic)
2. Lance un audit
3. Vérifie : message d'erreur chaleureux côté client, courriel d'échec
   envoyé à Christian, status = 'error' en DB

**Nettoyage final** :
- Supprime les audits de test de la DB (ou marque-les avec un flag `is_test`)
- Documente dans le README la section "Tester le pipeline en local"
- Vérifie que `npm run build` passe sans warning

**Critère de réussite** : Un audit complet produit 5 outputs JSON valides
persistés en DB, un écran de progression qui fonctionne, deux courriels
envoyés, et le tout en moins de 10 minutes.

---

## Livrables finaux de la Session 2B

- [x] `src/lib/ai/anthropic.ts`, `src/lib/ai/voyage.ts`, `src/lib/ai/config.ts`
- [x] `src/lib/ai/semantic-matching.ts`
- [x] `src/types/skills.ts`
- [x] `src/prompts/skill-1.md` à `skill-5.md` (extractions du YAML)
- [x] `api/skills/skill-1-context-builder.ts` à `skill-5-synthesis-roi-roadmap.ts`
- [x] `api/audit/run.ts` (Edge Function avec SSE)
- [x] `api/audit/send-completion-emails.ts`
- [x] `src/pages/audit/AuditProgress.tsx` + hook + composant
- [x] `src/lib/email/audit-submitted-client.ts`
- [x] `src/lib/email/audit-pending-review-admin.ts`
- [x] `src/lib/dates/businessHours.ts`
- [x] `scripts/generate-pattern-embeddings.ts`
- [x] `.env.example` mis à jour (ADMIN_EMAIL, ADMIN_NAME ajoutés)
- [x] Route `/audit/progress/:auditId` ajoutée au routeur
- [x] README mis à jour avec section "Pipeline et tests"
- [x] Modification du CTA de l'écran 7 du formulaire (Session 2A)

---

## Ce qui n'est PAS dans la Session 2B

- **Interface admin de révision** : reportée en Session 2C. En attendant,
  Christian révise les audits via Supabase SQL Editor avec la query fournie
  dans le courriel admin.
- **Bouton "approuver et envoyer au client"** : en Session 2C.
- **Courriel de livraison du rapport au client (post-approbation)** : en
  Session 2C.
- **Export DOCX/PDF du rapport** : Session ultérieure.
- **Stripe / paiement** : Session ultérieure.

---

## Notes, rappels et points d'attention

**Timeouts Vercel** : Le pipeline complet tourne entre 3 et 8 minutes.
Les fonctions serverless Node.js ont des limites strictes (10s Hobby,
60s Pro, 300s Pro avec Background Functions). Les Edge Functions avec
streaming SSE n'ont pas la même limite et sont le choix approprié ici.
Si tu rencontres des erreurs de timeout, vérifier la config runtime.

**Coût par audit** : À Opus 4.7 partout, ~2.25$/audit. Prévoir un suivi des
coûts pendant la beta (logger `tokensUsed` de chaque appel dans les
metadata persistées de l'audit).

**Pas de retry au niveau de l'orchestrateur** : Chaque skill a son retry
interne (1 retry sur JSON invalide). Si un skill échoue définitivement,
le pipeline entier marque l'audit en erreur. On ne tente pas de reprendre
un audit partiellement complété. C'est intentionnel — plus propre que
de gérer un système de reprise complexe pour le MVP.

**Parallélisation Skills 3 + 4** : Gain de 60-120 secondes par audit.
Vérifier que `Promise.all()` propage correctement les erreurs (si un
des deux skills échoue, tout le pipeline échoue, pas de demi-succès).

**Sécurité de l'auditId** : L'auditId est un UUID v4, donc non-devinable.
Ça suffit comme protection pour la page `/audit/progress/:auditId`. Pas
d'auth requise pour le MVP — le lien n'est pas partagé publiquement.

**Respecter les règles du YAML** : Le prompt système de chaque skill
contient des règles critiques (anti-hallucination, ne pas inventer de
métriques, éditorial québécois). Ces règles sont dans le YAML source
de vérité et doivent être copiées mot-à-mot dans les fichiers `.md`
extraits. Ne pas paraphraser.

**Commit après chaque étape** avec un message clair : `session-2b: step N - description`

---

## Si quelque chose tourne mal

- Si une skill produit un output JSON invalide même après retry : vérifier
  le prompt pour s'assurer qu'il demande explicitement JSON strict sans
  fence markdown. Le YAML contient déjà cette instruction.
- Si le SSE se coupe côté client : vérifier que le header
  `Cache-Control: no-cache` et `Connection: keep-alive` sont bien envoyés
  par la fonction Edge.
- Si pgvector ne retourne rien : vérifier que les embeddings sont bien
  générés (étape 5) et que l'index ivfflat existe.
- Si Resend échoue silencieusement : vérifier que le domaine expéditeur
  est vérifié dans la console Resend.

---

*Document produit le 23 avril 2026 pour la Session Claude Code 2B.*
*À lire en conjonction avec skills-prompts-v1.yaml et CONTEXT_PROJET_AUDIT_IA_5PENNYAI.md.*
