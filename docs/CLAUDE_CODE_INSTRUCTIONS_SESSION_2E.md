# Instructions Claude Code — Session 2E : Génération de diagrammes IA

> **Objectif** : Intégrer la génération automatique de diagrammes
> d'architecture (un par opportunité phase 1 et phase 2 du rapport) via
> l'API Gemini Nano Banana Pro, avec une planche style guide en
> référence pour assurer la constance visuelle. Permettre à Christian
> de prévisualiser, éditer le prompt et régénérer chaque diagramme
> individuellement depuis l'admin avant approbation.
>
> **Durée estimée** : 3-4 heures sur 1-2 sessions Claude Code.
>
> **Livrables** : Module générateur Gemini (`gemini-client.ts`),
> Skill 6 (générateur de prompts diagrammes), pipeline parallèle
> (`diagram-pipeline.ts`), intégration dans le pipeline d'audit,
> intégration dans le docx-builder, UI admin avec prévisualisation et
> édition de prompt par diagramme, endpoint de régénération.

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. `git commit -am "session-2e: start"` pour avoir un point de rollback
3. Donner ce document à Claude Code en contexte initial
4. Procéder **étape par étape**, commit après chaque étape avec un
   message clair (`session-2e: step N - description`)
5. Si une étape échoue, corriger avant de passer à la suivante
6. Si une décision semble ambiguë, demander à Christian au lieu de deviner

---

## Décisions structurantes (déjà tranchées, ne pas re-débattre)

- **Modèle Gemini** : `gemini-3-pro-image-preview` (Nano Banana Pro).
  Pas Nano Banana standard, pas Nano Banana 2 — Pro pour la qualité de
  rendu de texte (94 % de précision) et le mode Thinking automatique.
  Statut : Generative AI Preview, accepté pour le MVP.
- **SDK Node.js** : `@google/genai` (lib officielle Google DeepMind
  unifiée). Ne pas utiliser la legacy `@google/generative-ai`.
- **Pas de paramètre `temperature`** dans les appels Gemini 3. Google
  recommande explicitement de ne pas le spécifier sur cette génération
  de modèles (peut causer du looping). Le modèle gère lui-même la
  variabilité avec ses defaults.
- **Image de référence** : la planche `docs/references/style-guide-v1.png`
  (Diagram Style Guide v1) est passée à chaque appel Gemini comme
  pièce jointe. C'est ce qui assure la constance visuelle entre
  diagrammes.
- **Périmètre des diagrammes** : un diagramme par opportunité de
  **phase 1 (Quick wins)** et **phase 2 (Moyen terme)** uniquement.
  Les opportunités phase 3 (Long terme) et les options secondaires
  n'ont pas de diagramme. Typiquement 3-4 diagrammes par audit.
- **Pas de Mermaid en fallback**. Si Gemini échoue après 2 retries,
  le rapport est généré sans le diagramme concerné, avec un
  signalement dans l'admin pour régénération manuelle.
- **Régénération avec édition de prompt** : depuis l'admin, Christian
  peut voir le prompt complet utilisé pour chaque diagramme, l'éditer
  dans une textarea, puis régénérer. Cas d'usage typique : corriger
  une étiquette mal orthographiée, ajouter un composant manquant,
  retirer un élément superflu.
- **Pas de versioning** : on ne garde qu'une version par diagramme
  (la dernière régénérée écrase). Suffisant pour le MVP.
- **SynthID watermark** : toutes les images Gemini contiennent un
  watermark invisible. C'est un fait, pas une option à désactiver.
  Inutile de le mentionner dans le rapport client mais à savoir
  pour la transparence.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Sessions 2A à 2D livrées et fonctionnelles
- [ ] La variable `GEMINI_API_KEY` est dans `.env` local et configurée
      sur Vercel (déjà fait par Christian)
- [ ] La planche `style-guide-v1.png` (v3, sans annotations
      dimensionnelles) est disponible. Si pas encore dans le repo :
      Christian la déposera dans `docs/references/style-guide-v1.png`
      avant le démarrage de la session.
- [ ] Au moins un audit en `pending_review` ou `delivered` avec ses 5
      outputs populés (Marc Dubois en `pending_review` est le candidat
      idéal pour les tests bout-en-bout).
- [ ] Bucket Supabase Storage `audit-reports` opérationnel (créé en 2D).
      Le nouveau bucket `audit-diagrams` sera créé en Étape 1.

---

## Contexte à charger

Avant de commencer, Claude Code lit dans l'ordre :

1. `docs/PROJECT_STATE.md` — section « Architecture admin (Session 2C) »
   et « Architecture export DOCX (Session 2D) »
2. `docs/CONTEXT_PROJET.md` — pour le ton, la voix, et la philosophie
   produit (les diagrammes doivent renforcer la qualité perçue, pas
   en faire un produit gadget)
3. `docs/DESIGN_SYSTEM.md` — palette Navy/Orange/Cream, déjà internalisée
   dans la planche style guide
4. `docs/specs/skills-prompts-v2.yaml` — pour comprendre la structure
   des skills existants et où insérer le nouveau Skill 6
5. `docs/references/style-guide-v1.png` — la planche, à OUVRIR
   visuellement pour comprendre ce qu'elle contient (palette, boîtes
   standards, badges, flèches, silhouettes, icônes, typographie)
6. La documentation Gemini API (consultable en ligne) :
   - `https://ai.google.dev/gemini-api/docs/image-generation`
   - `https://googleapis.github.io/js-genai/`

---

## Étape 1 — Setup et fondations

**Objectif** : installer les dépendances, créer le bucket Storage et
appliquer les migrations DB pour tracer les diagrammes.

**Actions** :

- Installer la bibliothèque officielle :
  ```bash
  npm install @google/genai
  ```
  Vérifier que la version installée est compatible avec Vercel
  serverless (pas de binaires natifs).

- Créer le bucket Storage `audit-diagrams` :
  - Mode **privé** (pas de public access)
  - Politique RLS : seul le Service Role Key peut lire/écrire
  - Migration SQL recommandée :
    ```sql
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('audit-diagrams', 'audit-diagrams', false)
    ON CONFLICT (id) DO NOTHING;
    ```

- Migration DB pour tracer les diagrammes au niveau de l'audit :
  ```sql
  ALTER TABLE audits ADD COLUMN IF NOT EXISTS diagrams_metadata jsonb;
  ```
  Structure attendue de `diagrams_metadata` :
  ```json
  {
    "<solution_id>": {
      "title": "Architecture de la solution — ...",
      "storage_path": "<audit_id>/<solution_id>.png",
      "prompt_used": "Create a professional technical...",
      "generated_at": "2026-04-26T14:30:00Z",
      "status": "ok" | "failed",
      "failure_reason": "Optional error message"
    }
  }
  ```

- Ajouter de nouveaux event_types acceptés par `audit_review_events` :
  - `diagrams_generation_started`
  - `diagram_generated` (par solution)
  - `diagram_regenerated` (par solution, avec prompt édité)
  - `diagram_failed` (par solution)

- Vérifier que `docs/references/style-guide-v1.png` est bien présent
  dans le repo. Si non, demander à Christian de le déposer avant de
  continuer.

- Mettre à jour `.env.example` avec :
  ```
  # Génération de diagrammes (Session 2E)
  GEMINI_API_KEY=                # API key Google AI Studio
  ```

**Critère de réussite** :

- `npm run build` passe sans erreur
- Le bucket `audit-diagrams` est visible dans Supabase Storage
- La migration `ALTER TABLE` est appliquée
- `docs/references/style-guide-v1.png` est présent et visible

---

## Étape 2 — Module client Gemini

**Objectif** : créer un wrapper minimal autour de `@google/genai` qui
sait générer une image à partir d'un prompt textuel + une image de
référence, avec retry automatique et gestion d'erreurs propre.

**Fichier à créer** : `src/lib/diagrams/gemini-client.ts`

**Interface exposée** :

```typescript
export interface GenerateDiagramParams {
  prompt: string;
  referenceImagePath: string;  // chemin local vers la planche
  aspectRatio?: '16:9' | '4:3' | '21:9';  // défaut: '16:9'
  resolution?: '1K' | '2K' | '4K';  // défaut: '2K'
}

export interface GenerateDiagramResult {
  success: true;
  imageBuffer: Buffer;
  mimeType: 'image/png' | 'image/jpeg';
} | {
  success: false;
  error: string;
  attemptsCount: number;
}

export async function generateDiagram(
  params: GenerateDiagramParams
): Promise<GenerateDiagramResult>;
```

**Comportement attendu** :

1. Charger l'image de référence depuis `referenceImagePath` (lecture
   synchrone du fichier, conversion en base64).
2. Initialiser le client : `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`.
3. Appeler `ai.models.generateContent` avec :
   - `model: 'gemini-3-pro-image-preview'`
   - `contents: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Reference } }]`
   - **PAS** de `temperature` dans la config
   - `responseModalities: ['IMAGE']` si nécessaire selon la version du SDK
4. Parser la réponse : itérer sur `response.candidates[0].content.parts`,
   chercher la première part qui contient `inlineData` avec un mimeType
   image, extraire le buffer base64 et retourner.
5. Si échec (erreur API, pas de partie image dans la réponse, timeout) :
   relancer **2 fois** avec un backoff de 1s puis 3s.
6. Après 2 échecs : retourner `{ success: false, error, attemptsCount: 3 }`.
7. Logger discrètement chaque tentative en console (`console.log` avec
   préfixe `[gemini-diagram]`).

**Notes techniques** :

- Le SDK `@google/genai` gère automatiquement les Thought Signatures
  pour le mode Thinking — pas besoin de gestion manuelle.
- L'aspect ratio et la résolution se passent dans la config, vérifier
  la syntaxe exacte selon la version du SDK installée (consulter
  `https://googleapis.github.io/js-genai/` au moment de la session).
- Timeout par tentative : 60 secondes (la génération avec Thinking
  peut prendre 20-40 secondes).

**Critère de réussite** :

- Test ad-hoc : créer un script `scripts/test-gemini-client.ts` qui
  appelle `generateDiagram` avec un prompt simple et la planche en
  référence, sauvegarde le PNG résultant dans `/tmp/test-output.png`.
- Le script s'exécute sans erreur et produit un PNG valide.
- Le script gère bien l'erreur si la `GEMINI_API_KEY` est absente.

---

## Étape 3 — Skill 6 : générateur de prompts diagrammes

**Objectif** : ajouter un nouveau skill au pipeline existant qui prend
les outputs des skills 2 (opportunités) et 5 (rapport final) et
produit, pour chaque opportunité phase 1 et phase 2, un prompt Gemini
structuré et complet prêt à être envoyé.

**Fichier à modifier** : `docs/specs/skills-prompts-v2.yaml`

**Position** : Skill 6, après le Skill 5 (rapport final).

**Inputs du Skill 6** :

- `opportunities_output` (output complet du Skill 2)
- `report_output` (output complet du Skill 5, pour récupérer les
  titres officiels et les phases)
- `intake_data` (pour le secteur du client, qui aide Gemini à choisir
  les bonnes icônes)

**Output du Skill 6** (structure JSON stricte) :

```yaml
diagrams:
  - solution_id: "string"           # identifiant unique de l'opportunité
    title: "string"                 # titre du diagramme (ex: "Architecture
                                    # de la solution — Prise de rendez-vous
                                    # automatisée")
    phase: "phase_1" | "phase_2"
    components:                     # liste structurée pour debug et édition
      - id: "string"
        type: "endpoint_left" | "secondary_box" | "central_box" |
              "secondary_box_top" | "secondary_box_bottom" | "endpoint_right"
        position: "left" | "center_left" | "center" | "center_right" | "right"
        label: "string"
        subtitle: "string | null"
        icon_hint: "string"         # ex: "calendar", "microphone",
                                    # "dental chair (invent in style)"
        badge: null | { label: "string", subtitle: "string", icon: "string" }
    arrows:
      - from: "component_id"
        to: "component_id"
        label: "string | null"
        style: "horizontal" | "vertical_down" | "branch_up" |
               "branch_down" | "return_arc"
    prompt_full: "string"           # le prompt textuel complet prêt à
                                    # être envoyé à Gemini, généré
                                    # automatiquement à partir des champs
                                    # ci-dessus selon le template invariant
```

**Template invariant du prompt** (à intégrer dans le Skill 6) :

Le Skill 6 produit `prompt_full` en assemblant un template fixe (la
structure validée pendant les tests) avec les sections variables
(components, arrows, title) tirées des champs structurés.

Le template invariant inclut :
- En-tête : « Create a professional technical architecture diagram... »
- Référence à la planche : « ATTACHED IMAGE: 5PennyAi Diagram Style
  Guide v1. Carefully analyze the attached style guide and apply its
  visual rules... The icons shown in the style guide are NOT a fixed
  catalog — for icons not present, invent new ones in the
  demonstrated style. »
- LAYOUT (16:9, white background, etc.)
- COLOR PALETTE (Navy/Orange/Cream/grey/white avec hex codes)
- TYPOGRAPHY (sans-serif, sentence case, sizes hierarchy)
- DO NOT INCLUDE (la liste exhaustive des contraintes négatives)

Les sections variables sont uniquement :
- Le titre du diagramme (`TITLE AT TOP`)
- Les composants (`COMPONENTS TO DRAW`)
- Les flèches (`ARROWS`)

**Règles de sélection du composant central** :

Le composant central (boîte navy) est l'**outil ou service IA** qui
porte la solution. Exemples :
- Solution « Prise de RDV en ligne » → central = GOrendezvous
- Solution « Réceptionniste vocale » → central = AgentZap (ou autre
  outil recommandé dans `stack_output`)
- Solution « Assistant courriel » → central = Claude IA

Si l'outil principal n'est pas évident, prendre le premier outil
recommandé dans la `stack_output` pour cette solution.

**Règles de sélection des composants secondaires** :

Le Skill 6 doit identifier 4-6 composants pertinents par solution.
Patterns courants :
- Acteur entrant (gauche) : Patient, Client, Demandeur
- Canal d'entrée : Site web, Téléphone, Application mobile, Boîte
  courriel
- Composant central : l'outil IA (navy)
- Sorties / résultats : 2 boîtes secondaires verticales typiquement
- Acteur sortant (droite) : Cabinet, Clinique, Équipe, Conseiller

Pour les solutions avec composante humaine importante (révision,
validation, transfert), inclure une silhouette « Persona interne »
avec un label spécifique au métier (« Avocat », « Médecin »,
« Conseiller »).

**Modèle utilisé pour le Skill 6** :

`claude-opus-4-7` comme les autres skills (cohérence). Max tokens : 8000.
Pas de web search nécessaire.

**Critère de réussite** :

- Le Skill 6 est ajouté à `skills-prompts-v2.yaml` avec sa spec complète.
- Test ad-hoc : appeler le skill manuellement avec les outputs de
  l'audit Marc Dubois → vérifier que le YAML produit contient 3-4
  entrées (selon le nombre d'opportunités phase 1 et 2 de Marc), avec
  des `prompt_full` cohérents et bien formés.
- Vérifier visuellement que les `prompt_full` ressemblent fortement aux
  prompts des tests #1, #2, #3 que Christian a validés. Si fort
  écart : ajuster le template invariant.

---

## Étape 4 — Service de génération en parallèle

**Objectif** : orchestrer la génération de tous les diagrammes d'un
audit en parallèle, gérer les uploads Storage, et mettre à jour
`diagrams_metadata`.

**Fichier à créer** : `src/lib/diagrams/diagram-pipeline.ts`

**Interface exposée** :

```typescript
export async function generateAuditDiagrams(
  auditId: string
): Promise<{
  generated: number;
  failed: number;
  details: Array<{
    solution_id: string;
    status: 'ok' | 'failed';
    storage_path?: string;
    error?: string;
  }>;
}>;
```

**Comportement attendu** :

1. Récupérer l'audit complet depuis Supabase, vérifier qu'il a un
   `report_output` valide.
2. Si le Skill 6 n'a pas encore produit de prompts (pas de section
   `diagrams_prompts` dans le report ou ailleurs selon où le Skill 6
   stocke son output) : appeler le Skill 6 d'abord. Sinon : utiliser
   les prompts existants.
3. Émettre l'event `diagrams_generation_started` dans
   `audit_review_events`.
4. Pour chaque entrée des prompts diagrammes : appeler
   `generateDiagram(prompt, 'docs/references/style-guide-v1.png')`
   en parallèle (`Promise.all` ou `Promise.allSettled`).
5. Pour chaque résultat :
   - Si succès : uploader le PNG dans
     `audit-diagrams/<audit_id>/<solution_id>.png` via Service Role Key,
     mettre à jour `diagrams_metadata[<solution_id>]` avec
     `{ title, storage_path, prompt_used, generated_at, status: 'ok' }`,
     émettre event `diagram_generated`.
   - Si échec : mettre à jour `diagrams_metadata[<solution_id>]` avec
     `{ title, prompt_used, status: 'failed', failure_reason }`,
     émettre event `diagram_failed`.
6. Retourner le résumé `{ generated, failed, details }`.

**Notes** :

- Utiliser `Promise.allSettled` pour ne pas bloquer toute la
  génération si un seul diagramme échoue.
- Le `prompt_used` stocké en DB est essentiel pour permettre la
  régénération avec édition à l'Étape 7.
- Limite de parallélisme : Gemini accepte des appels concurrents,
  mais pour ne pas saturer ni risquer du throttling, limiter à 3-4
  appels en parallèle. Si plus de diagrammes : faire des batches.

**Critère de réussite** :

- Test sur Marc Dubois : `generateAuditDiagrams(<marc-id>)` produit
  3-4 PNG dans le bucket Storage, met à jour `diagrams_metadata`,
  et émet les bons events. Durée totale typique : 30-60 secondes.

---

## Étape 5 — Intégration au pipeline d'audit

**Objectif** : déclencher la génération de diagrammes automatiquement
à la fin du pipeline existant, avant le passage en `pending_review`.

**Fichier à modifier** : `api/audit/run.ts` (ou équivalent
orchestrateur SSE de la Session 2B).

**Modifications** :

1. Après l'exécution du Skill 5 (rapport final), avant le passage du
   statut à `pending_review` : appeler `generateAuditDiagrams(auditId)`.
2. Émettre via SSE un événement de progression pour que l'écran de
   chargement client affiche « Génération des diagrammes... » (cf.
   séquence existante de la 2B).
3. Si **toute** la génération échoue (0 diagramme généré) : ne pas
   bloquer le passage en `pending_review` — l'audit est tout de même
   livrable, juste sans visuels. Logger un warning et signaler dans
   l'admin.
4. Mettre à jour le statut à `pending_review` comme avant.

**Comportement aux reruns** : si un audit est relancé via
`/api/audit/[id]/rerun` (pour `changes_requested`), le pipeline
régénère **aussi** les diagrammes (les anciens dans le bucket Storage
sont écrasés par les nouveaux, même path).

**Critère de réussite** :

- Lancer un audit complet sur un nouveau persona test (par exemple
  Julie Martin si elle est seedable, ou rejouer Sophie via le bouton
  rerun depuis l'admin).
- Vérifier la progression SSE côté client : étape « Génération des
  diagrammes » visible dans l'écran de chargement.
- Vérifier en DB : `diagrams_metadata` populé, statut final
  `pending_review`, events `diagrams_generation_started`,
  `diagram_generated` × N, et le statut final.

---

## Étape 6 — Intégration au docx-builder

**Objectif** : insérer chaque diagramme PNG dans le DOCX généré, à
l'endroit approprié (après la description de chaque opportunité dans
les sections phase 1 et phase 2 de la feuille de route).

**Fichier à modifier** : `src/lib/report/docx-builder.ts` (créé en
Session 2D).

**Modifications** :

1. Au début de la fonction `buildAuditDocx`, charger les métadonnées
   diagrammes depuis `audit.diagrams_metadata`.
2. Pour chaque opportunité phase 1 ou phase 2 dans la feuille de
   route, après la description textuelle :
   - Si `diagrams_metadata[<solution_id>].status === 'ok'` : télécharger
     le PNG depuis Supabase Storage (Service Role Key, signed URL
     interne ou accès direct), l'insérer dans le DOCX comme image
     centrée, largeur ~16cm (équivalent largeur utile A4 portrait
     avec marges standard).
   - Si `status === 'failed'` ou si la métadonnée est absente : insérer
     un paragraphe italique discret en muted grey du genre
     « *Diagramme non disponible pour cette solution.* » Pas de stack
     trace, pas de message technique.
3. Conserver la consistance visuelle : centrer les images, ajouter une
   légende italique sous chaque image avec le titre du diagramme
   (`diagrams_metadata[<solution_id>].title`).

**Notes** :

- Le package `docx` (npm) supporte les images via `ImageRun` ou
  équivalent — voir documentation à jour.
- Format attendu : PNG ou JPEG. Si Gemini retourne du PNG (cas standard),
  pas de conversion nécessaire.
- Largeur cible : 16cm = 6.3 pouces = 6048 EMUs si nécessaire en EMU.
- La page rapport publique HTML (créée en 2C) doit aussi afficher les
  diagrammes — c'est l'objet de la modification suivante.

**Modification additionnelle** : `src/components/admin/sections/ReportView.tsx`
(et le wrapper de la page publique `/rapport/:token`)

Insérer les diagrammes dans le rendu HTML aux mêmes positions que dans
le DOCX. Utiliser des `<img>` avec signed URL Storage (15 min de
validité, régénérée à chaque chargement de page).

**Critère de réussite** :

- Régénérer un DOCX pour Marc Dubois après que ses diagrammes ont été
  générés. Ouvrir dans Word : 3-4 diagrammes visibles aux bons
  endroits, centrés, légendés.
- Imprimer ou exporter le DOCX en PDF, vérifier que les étiquettes
  des diagrammes (« Tapez 0 pour un humain », etc.) restent lisibles
  à l'œil normal sur du A4.
- Charger la page rapport publique de Marc : les mêmes diagrammes
  s'affichent dans le navigateur.

---

## Étape 7 — UI admin : prévisualisation et édition de prompt

**Objectif** : ajouter à l'onglet Rapport de la page détail admin une
section dédiée aux diagrammes, avec prévisualisation, édition de prompt
et régénération individuelle.

**Fichier à modifier** : `src/components/admin/sections/ReportView.tsx`
(et créer un sous-composant `DiagramsPanel.tsx`).

**UI à construire** :

Dans l'onglet Rapport (`ReportView`), après le contenu textuel principal
mais avant les notes de section, ajouter une section « Diagrammes » :

- En-tête : « Diagrammes — phase 1 et phase 2 »
- Si `diagrams_metadata` est null ou vide : message informatif
  « Aucun diagramme n'a été généré pour cet audit. »
- Sinon : pour chaque entrée dans `diagrams_metadata`, une carte avec :
  - **Statut visuel** : pastille verte « Généré » ou ambre « Échec »
  - **Titre du diagramme** (en navy 14pt bold)
  - **Aperçu de l'image** (signed URL Storage, hauteur fixe 200-250px,
    largeur auto, bordure légère grey)
  - **Bouton « Voir en grand »** : ouvre l'image dans un nouvel onglet
  - **Bouton « Éditer le prompt »** : ouvre une modal
  - **Bouton « Régénérer »** : appelle l'endpoint avec le prompt actuel
    (sans édition)
  - Si `status === 'failed'` : afficher la `failure_reason` en muted
    grey avec un bouton « Régénérer » en évidence.

**Modal d'édition de prompt** :

- Titre : « Éditer le prompt — <titre du diagramme> »
- Textarea préremplie avec `diagrams_metadata[<solution_id>].prompt_used`,
  hauteur 400-500px, police monospace, largeur 100% du modal
- Note d'aide en muted grey : « Les modifications du prompt sont
  appliquées uniquement à cette régénération. La planche style guide
  est jointe automatiquement. »
- Bouton « Annuler » (secondaire)
- Bouton « Régénérer avec ce prompt » (primary, navy)

**Endpoint à créer** :
`POST /api/admin/audits/:id/diagrams/:solution_id/regenerate`

Body :
```json
{
  "prompt": "string (optionnel — si absent, utilise prompt_used courant)"
}
```

Comportement :
1. Vérifier auth admin.
2. Récupérer l'audit, valider qu'il a une entrée pour `solution_id`
   dans `diagrams_metadata`.
3. Appeler `generateDiagram(prompt || diagrams_metadata[solution_id].prompt_used,
   'docs/references/style-guide-v1.png')`.
4. Si succès : uploader dans Storage (écrase l'ancien fichier au même
   path), mettre à jour `diagrams_metadata[solution_id]` avec le
   nouveau `prompt_used` (s'il a été édité), `generated_at`, statut
   `ok`, retirer `failure_reason` si présent. Émettre event
   `diagram_regenerated`.
5. Si échec : mettre à jour `status: 'failed'` et `failure_reason`,
   émettre event `diagram_failed`.
6. Retourner `{ status: 'ok' | 'failed', error?: string }` au client.

**Notes UX** :

- Pendant la régénération : bouton disabled, spinner visible, durée
  attendue 20-40 secondes (ne pas mettre de barre de progression
  fausse, juste un loader).
- Toast de succès : « Diagramme régénéré ».
- Toast d'erreur : « Échec de régénération : <raison> ».
- Après succès : recharger la signed URL de l'aperçu (cache-bust
  pour forcer le rechargement de la nouvelle image).

**Critère de réussite** :

- Sur Marc Dubois : naviguer dans l'admin, ouvrir l'audit, onglet
  Rapport, scroller jusqu'à la section Diagrammes.
- Cliquer « Voir en grand » sur un diagramme : l'image s'ouvre dans un
  nouvel onglet, en taille réelle.
- Cliquer « Éditer le prompt » : la modal s'ouvre avec le prompt
  prérempli, lisible et éditable.
- Modifier le prompt (par exemple : ajouter « add a small lock icon
  next to the central component »), cliquer « Régénérer » : après
  20-40 secondes, le nouvel aperçu apparaît avec la modification
  visible.
- Vérifier que `diagrams_metadata[<solution_id>].prompt_used` reflète
  bien le nouveau prompt en DB.

---

## Étape 8 — Test bout-en-bout

**Objectif** : valider le flux complet de génération, révision et
livraison d'un audit avec diagrammes.

**Procédure** :

1. **Génération initiale** :
   - Lancer un nouveau audit complet via le formulaire d'intake (ou
     rejouer Marc Dubois via le bouton « Relancer le pipeline » depuis
     l'admin).
   - Pendant le SSE, vérifier que l'étape « Génération des diagrammes »
     est visible côté client.
   - À la fin : statut `pending_review`, `diagrams_metadata` populé en
     DB avec 3-4 entrées en `ok`, fichiers PNG dans le bucket Storage.

2. **Révision admin** :
   - Se connecter à l'admin, ouvrir l'audit nouvellement généré.
   - Onglet Rapport → section Diagrammes : vérifier les 3-4 aperçus.
   - Choisir un diagramme avec un défaut visible (ou en provoquer un
     en éditant le prompt pour ajouter une faute volontaire).
   - Éditer le prompt, régénérer, vérifier que la nouvelle version
     reflète l'édition.

3. **Approbation et livraison** :
   - Cliquer « Approuver et envoyer » sur l'audit.
   - Vérifier dans la console (ou Brevo si configuré) que le DOCX
     joint contient les diagrammes aux bons endroits.
   - Cliquer le lien public depuis le log courriel : la page web
     affiche les diagrammes intégrés au rapport.

4. **Test d'échec partiel** :
   - Pour simuler un échec Gemini : modifier temporairement
     `GEMINI_API_KEY` avec une valeur invalide en local, relancer un
     audit.
   - Vérifier que tous les diagrammes échouent gracieusement, que
     l'audit passe quand même en `pending_review`, que l'admin affiche
     les statuts d'échec, et que le DOCX est généré sans diagramme
     (avec les paragraphes de remplacement).
   - Restaurer la `GEMINI_API_KEY` valide, régénérer un diagramme via
     l'admin, vérifier qu'il revient en statut `ok`.

5. **Vérification visuelle finale** :
   - Imprimer le DOCX final en PDF.
   - Comparer la lisibilité des diagrammes avec celle des tests
     manuels qu'on a faits dans AI Studio.
   - Si les étiquettes deviennent floues ou illisibles, **monter la
     résolution** : passer le `resolution` du `gemini-client` de `'2K'`
     à `'4K'` et refaire un audit pour vérifier l'amélioration.

**Polissage** :

- Tous les boutons admin sont disabled pendant les requêtes.
- Toasts de succès/erreur sur les actions de régénération.
- Erreur Storage gracieuse : si l'upload échoue, pas de plantage du
  flux global.
- Documentation : mettre à jour le `README.md` avec une section
  « Génération de diagrammes » (où est le bucket, comment régénérer
  manuellement, comment debugger en local).

---

## Livrables finaux de la Session 2E

Après cette session, le repo doit contenir :

- [x] `@google/genai` installé et fonctionnel en Vercel
- [x] Bucket Supabase Storage `audit-diagrams` créé et privé
- [x] Migration DB `diagrams_metadata` (jsonb) appliquée
- [x] `docs/references/style-guide-v1.png` (la planche v3) déposé
- [x] Module `src/lib/diagrams/gemini-client.ts` opérationnel avec
      retry et gestion d'erreurs
- [x] Skill 6 ajouté à `skills-prompts-v2.yaml` avec son template
      invariant et sa structure d'output
- [x] Module `src/lib/diagrams/diagram-pipeline.ts` qui orchestre
      la génération en parallèle
- [x] Pipeline d'audit modifié pour déclencher la génération après
      le Skill 5
- [x] `docx-builder.ts` modifié pour insérer les diagrammes
- [x] `ReportView.tsx` (admin et page publique) modifié pour afficher
      les diagrammes
- [x] Composant `DiagramsPanel.tsx` créé pour l'onglet Rapport admin
      avec prévisualisation, édition de prompt et régénération
- [x] Endpoint `POST /api/admin/audits/:id/diagrams/:solution_id/regenerate`
- [x] Variable d'env `GEMINI_API_KEY` documentée dans `.env.example`
- [x] `PROJECT_STATE.md` mis à jour (Session 2E ✅)
- [x] `README.md` mis à jour avec section génération de diagrammes

---

## Ce qui n'est PAS dans la 2E

Pour éviter toute confusion, ces éléments sont traités séparément :

- **Modifications de prompts pour quickstart 1 page et ligne par outil** :
  ce sont des modifications du Skill 5 (rédaction du rapport final) à
  faire séparément en prompt engineering, pas en Claude Code. Discussion
  conversationnelle avec Christian, modification de
  `skills-prompts-v2.yaml`, test sur Sophie/Marc.
- **Mermaid en fallback** : explicitement écarté. Si Gemini échoue,
  pas de diagramme.
- **Versioning des diagrammes** : on ne garde qu'une version par
  diagramme. Pas d'historique.
- **Diagrammes pour la phase 3 (long terme)** : périmètre limité à
  phase 1 et phase 2.
- **Diagrammes pour les options secondaires** : pas de diagramme pour
  les opportunités classées « options secondaires » dans la matrice
  impact/effort.
- **Édition WYSIWYG des diagrammes** : Christian peut éditer le prompt
  textuel, pas le rendu visuel directement. Pour des modifications
  fines visuelles, il faut iterer sur le prompt.
- **Style guide v2 (planche Figma)** : si la v3 actuelle suffit en
  pratique, on n'investit pas dans une version Figma plus contrôlée.
  À évaluer après les beta-tests.

---

## Notes et rappels

- **Modèle preview** : `gemini-3-pro-image-preview` est en statut
  Generative AI Preview. Surveiller les annonces de stabilisation /
  deprecation. Pour la production payante (post beta-tests),
  envisager une stratégie de fallback vers `gemini-3.1-flash-image-preview`
  si le Pro est déprécié sans remplacement immédiat.
- **Coût estimé** : ~$0.54/audit pour 4 diagrammes en 2K. Sur le
  coût total $3.50-5/audit en Opus 4.7, ~10 % d'augmentation.
  Acceptable pour un livrable à 199-249 $.
- **SynthID watermark** : invisible sur toutes les images Gemini.
  Pas une option à désactiver. À documenter dans la politique
  Loi 25 / transparence si nécessaire.
- **Service Role Key** : utilisée pour tous les uploads/downloads
  Storage. Ne jamais exposer côté client.
- **Tokens visuels** : pas de couleur hardcodée dans le frontend admin.
  Pour les PNG générés : la palette est déjà figée par le prompt
  template, c'est intentionnel (c'est même le point).
- **Bilinguisme** : tout est en français.
- **Rollback facile** : si une étape casse quelque chose, `git reset
  --hard HEAD~1` et reprendre.
- **Logs de debug** : préfixer tous les logs Gemini par `[gemini-diagram]`
  pour faciliter le grep en production.

---

## Si quelque chose tourne mal

- **Si Gemini renvoie systématiquement des images sans texte ou
  corrompues** : vérifier que la planche style guide est bien jointe
  (le prompt seul produit des résultats moins constants). Vérifier
  aussi le mimeType (`image/png` strict).
- **Si les images sortent en basse résolution malgré `resolution: '2K'`** :
  vérifier la syntaxe exacte du paramètre dans la version installée
  du SDK. Consulter `https://googleapis.github.io/js-genai/`.
- **Si le SDK refuse `responseModalities`** : c'est probablement implicite
  pour le modèle d'image — retirer le paramètre et tester.
- **Si la génération bloque le pipeline** : timeout sur chaque appel
  Gemini (60s max), `Promise.allSettled` pour ne pas bloquer sur un
  diagramme défaillant.
- **Si Supabase Storage refuse l'upload** : vérifier les RLS policies
  du bucket `audit-diagrams`, vérifier la Service Role Key.
- **Si le DOCX devient corrompu après l'ajout d'images** : vérifier
  que les buffers PNG ne sont pas vides ou tronqués. Le package `docx`
  est strict sur les formats — convertir en JPEG en dernier recours.
- **Si Christian observe une dérive visuelle** (diagrammes qui ne
  ressemblent plus à la planche) : régénérer la planche v3 elle-même
  avec le prompt de référence, vérifier qu'elle n'a pas été altérée
  ou compressée trop fortement.

---

*Document rédigé le 26 avril 2026.*
*Référence visuelle : `docs/references/style-guide-v1.png` (planche v3 produite et validée le même jour).*
*Pré-requis tests : Marc Dubois en `pending_review` est le persona de validation principal pour cette session.*
