# Instructions Claude Code — Session 2F : Re-seed de la librairie de patterns enrichie + table sector_profiles

> **Objectif** : Mettre à jour la base Supabase pour refléter la nouvelle
> librairie de patterns produite lors des sessions de production de
> Christian (10 patterns au total, dont 5 nouveaux) et introduire un
> nouveau type de document de contexte (`sector_profiles`) pour gérer
> l'intelligence sectorielle au-delà des patterns horizontaux. Tout
> ça en générant les embeddings Voyage-3 nécessaires au matching
> sémantique du Skill 2 et à la classification sectorielle du Skill 1.
>
> **Durée estimée** : 1-2 heures sur 1 session Claude Code.
>
> **Livrables** : migration SQL pour `sector_profiles`, mise à jour
> de la table `patterns` (5 nouveaux + 7 mis à jour), nouveau script
> `seed-sector-profiles.js`, mise à jour de `seed-patterns.js` si
> nécessaire, tests de validation des embeddings et du matching.

---

## Comment utiliser ce document

1. Ouvrir le repo dans VS Code avec Claude Code activé
2. `git commit -am "session-2f: start"` pour avoir un point de rollback
3. Donner ce document à Claude Code en contexte initial
4. Procéder **étape par étape**, commit après chaque étape avec un
   message clair (`session-2f: step N - description`)
5. Si une étape échoue, corriger avant de passer à la suivante
6. Si une décision semble ambiguë, demander à Christian au lieu de deviner

---

## Décisions structurantes (déjà tranchées, ne pas re-débattre)

- **Modèle d'embedding** : Voyage-3 (1024 dimensions, `inputType='document'`
  pour l'indexation). Cohérent avec le seed initial des 5 premiers
  patterns. Pas d'OpenAI, pas de Voyage-3-large.
- **Stratégie de chunking** : un seul embedding par document (pattern
  ou sector_profile). Pas de multi-vecteur. Le texte embeddé est une
  concaténation structurée des champs narratifs en français + tags
  + capacités. Détails dans les helpers du script.
- **Table `sector_profiles`** : nouvelle table dédiée, séparée de
  `patterns`. Schéma similaire (id, content JSONB, embedding VECTOR(1024),
  champs extraits pour filtrage) mais avec ses propres champs métier
  (industry_keywords, etc.). Permet au Skill 1 de retrouver le bon
  profil sectoriel par matching sémantique ET par règle déterministe
  sur le tag `industry_match`.
- **Stratégie d'upsert** : le script existant `seed-patterns.js` fait
  déjà de l'upsert (insert ou update sur conflit). On le réutilise
  tel quel pour les patterns. Le nouveau script `seed-sector-profiles.js`
  reprend la même logique.
- **Pas de versioning des patterns en DB** : à chaque seed, le contenu
  est remplacé. Le champ `version` du YAML est tracké mais il n'y a
  pas d'historique des versions précédentes. Suffisant pour le MVP.
- **Pas de suppression des patterns retirés** : si un YAML disparaît
  du dossier `patterns/`, le script ne le supprime pas de la DB. À
  faire manuellement si besoin via SQL.
- **Profil sectoriel immobilier comme pilote** : c'est le premier
  profil sectoriel produit. Le système doit être conçu pour en
  accueillir plusieurs (cabinets pros, restaurants multi-sites, OBNL,
  etc.) dans le futur sans modification de schéma.

---

## Prérequis (à vérifier avant de commencer)

- [ ] Sessions 2A à 2E livrées et fonctionnelles
- [ ] Variables d'environnement présentes dans `.env` :
      `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY`
- [ ] Le script `scripts/seed-patterns.js` existe et fonctionne
      (issu de la Session 1 de l'architecture)
- [ ] La table `patterns` existe en DB avec `embedding VECTOR(1024)`
- [ ] Christian a fourni les 11 fichiers YAML produits dans la
      session de production (10 patterns + 1 sector_profile) — voir
      la liste exacte dans l'Étape 0

---

## Étape 0 — Préparer les fichiers source

**Objectif** : ranger les 11 fichiers YAML produits par Christian dans
les bons dossiers avant de toucher au code.

**Ce que Christian a fourni** (dans `/mnt/user-data/outputs/` côté
Claude.ai, à récupérer manuellement) :

**Patterns mis à jour (suffixe `-mod`)** :
- `pattern-001-receptionniste-ia-vocale-v2-mod.yaml`
- `pattern-002-chatbot-textuel-multicanal-v2-mod.yaml`
- `pattern-003-prise-rendez-vous-automatisee-mod.yaml`
- `pattern-004-redaction-contenu-marketing-mod.yaml`
- `pattern-005-gestion-courriels-ia-mod.yaml`
- `pattern-007-transcription-reunions-mod.yaml`
- `pattern-009-analyse-donnees-tableaux-bord-mod.yaml`

**Patterns nouveaux (sans suffixe)** :
- `pattern-006-devis-factures-automatises.yaml`
- `pattern-008-rh-recrutement.yaml`
- `pattern-014-service-client-support.yaml`

**Profil sectoriel** :
- `profil-sectoriel-courtage-immobilier-qc.yaml`

**Manipulation à demander à Claude Code** :

```
ÉTAPE 0 : Préparation des fichiers source

Christian va déposer 11 fichiers YAML dans le dossier `incoming-yaml/`
à la racine du repo (à créer si nécessaire). Une fois déposés :

1. Crée le dossier `sector-profiles/` à la racine du repo (parallèle
   au dossier `patterns/` existant).

2. Pour les 7 fichiers patterns avec suffixe `-mod` :
   - Renomme-les en supprimant `-mod` (ex: `pattern-001-receptionniste-ia-vocale-v2-mod.yaml`
     devient `pattern-001-receptionniste-ia-vocale-v2.yaml`)
   - Déplace-les dans `patterns/`, en écrasant les versions existantes
   - Pour chacun, lance `python3 -c "import yaml; yaml.safe_load(open('patterns/<nom>'))"` ou
     équivalent Node `js-yaml` pour valider que c'est du YAML valide

3. Pour les 3 patterns nouveaux (006, 008, 014) :
   - Déplace-les directement dans `patterns/`
   - Valide chaque YAML

4. Pour le profil sectoriel :
   - Déplace `profil-sectoriel-courtage-immobilier-qc.yaml` dans
     `sector-profiles/`
   - Valide le YAML

5. Liste le contenu final des deux dossiers et confirme :
   - patterns/ contient bien 10 fichiers (.yaml)
   - sector-profiles/ contient 1 fichier (.yaml)

6. Ne lance aucun seed pour l'instant. C'est une étape de mise en
   place uniquement.
```

**Critère de réussite** :
- `patterns/` contient exactement 10 fichiers YAML valides
- `sector-profiles/` contient exactement 1 fichier YAML valide
- Aucun fichier ne contient le suffixe `-mod`

---

## Étape 1 — Migration SQL pour la table sector_profiles

**Objectif** : créer la table `sector_profiles` avec son embedding,
sa structure, ses index, et la fonction RPC pour le matching.

**Fichier à créer** : `migrations/002_create_sector_profiles.sql`
(ou équivalent selon le système de migration en place — vérifier
s'il y a un dossier `supabase/migrations/` standard).

**Schéma à implémenter** :

```sql
-- Table sector_profiles : profils sectoriels enrichis pour Skill 1
CREATE TABLE IF NOT EXISTS sector_profiles (
  id TEXT PRIMARY KEY,  -- ex: 'secteur-courtage-immobilier-qc-residentiel'

  -- Contenu complet du profil (YAML converti en JSON)
  content JSONB NOT NULL,

  -- Champs extraits pour filtrage et matching déterministe
  title_fr TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'profil-sectoriel',
  version TEXT NOT NULL,
  language TEXT DEFAULT 'fr',

  -- Mots-clés d'industrie pour matching déterministe par le Skill 1
  -- Ex: ['courtage-immobilier', 'agent-immobilier', 'courtier-immobilier', 'immobilier']
  industry_keywords TEXT[],

  -- Texte concaténé utilisé pour générer l'embedding
  embedding_source TEXT,

  -- Embedding vectoriel (Voyage-3, 1024 dims)
  embedding VECTOR(1024),

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sector_profiles IS 'Profils sectoriels pour enrichir le contexte du Skill 1 (Context Builder)';

-- Index pour matching sémantique
CREATE INDEX IF NOT EXISTS sector_profiles_embedding_idx
  ON sector_profiles
  USING hnsw (embedding vector_cosine_ops);

-- Index pour matching déterministe par mots-clés
CREATE INDEX IF NOT EXISTS sector_profiles_industry_keywords_idx
  ON sector_profiles
  USING gin (industry_keywords);

-- Fonction RPC pour matcher un profil sectoriel par mots-clés
-- (matching déterministe — le Skill 1 préfère ça à un matching sémantique
-- pour cette fonction)
CREATE OR REPLACE FUNCTION match_sector_profile_by_industry(
  industry_tag TEXT
)
RETURNS TABLE (
  id TEXT,
  title_fr TEXT,
  content JSONB,
  match_strength INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.title_fr,
    sp.content,
    array_length(
      ARRAY(
        SELECT unnest(sp.industry_keywords)
        INTERSECT
        SELECT industry_tag
      ),
      1
    ) AS match_strength
  FROM sector_profiles sp
  WHERE industry_tag = ANY(sp.industry_keywords)
  ORDER BY match_strength DESC NULLS LAST
  LIMIT 1;
END;
$$;

-- Fonction RPC alternative pour matching sémantique (fallback si
-- aucun mot-clé ne match exactement)
CREATE OR REPLACE FUNCTION match_sector_profiles_semantic(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 1
)
RETURNS TABLE (
  id TEXT,
  title_fr TEXT,
  content JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.title_fr,
    sp.content,
    1 - (sp.embedding <=> query_embedding) AS similarity
  FROM sector_profiles sp
  WHERE 1 - (sp.embedding <=> query_embedding) > match_threshold
  ORDER BY sp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_sector_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sector_profiles_updated_at ON sector_profiles;
CREATE TRIGGER sector_profiles_updated_at
  BEFORE UPDATE ON sector_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_sector_profiles_updated_at();
```

**Manipulation à demander à Claude Code** :

```
ÉTAPE 1 : Migration SQL pour sector_profiles

1. Identifie le système de migration en place dans le repo :
   - S'il y a `supabase/migrations/` avec des fichiers numérotés,
     utilise ce dossier avec le numéro suivant (ex: 002, 003).
   - S'il n'y a pas de système formel, crée un dossier `migrations/`
     à la racine et fichier `002_create_sector_profiles.sql`.

2. Copie exactement le SQL fourni dans cette Étape 1 dans le fichier
   de migration.

3. Ne lance PAS la migration automatiquement — Christian va
   l'exécuter manuellement dans Supabase SQL Editor pour validation
   visuelle.

4. Confirme que le fichier est créé au bon endroit.
```

**Manipulation à faire par Christian** (post-Claude Code) :

1. Ouvrir Supabase SQL Editor
2. Copier le contenu du fichier de migration
3. Exécuter
4. Vérifier que les 3 objets sont créés :

```sql
SELECT
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'sector_profiles') as table_exists,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'match_sector_profile_by_industry') as fn1_exists,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'match_sector_profiles_semantic') as fn2_exists;
```

Tous doivent retourner `true`.

**Critère de réussite** :
- Fichier de migration créé dans le bon dossier
- Migration exécutée par Christian sans erreur
- Les 3 objets DB existent (table + 2 fonctions RPC)

---

## Étape 2 — Mise à jour du script seed-patterns.js

**Objectif** : valider que `scripts/seed-patterns.js` fonctionne avec
les 10 patterns (vs 5 originaux), et bonifier le `buildEmbeddingSource`
pour exploiter les nouveaux champs introduits dans les patterns
récents (notamment les `customer_cases`, `risks`, `complementary_patterns`).

**Manipulation à demander à Claude Code** :

```
ÉTAPE 2 : Bonifier seed-patterns.js pour la nouvelle librairie

1. Ouvre `scripts/seed-patterns.js`. Étudie la fonction
   `buildEmbeddingSource(pattern)` actuelle.

2. La fonction actuelle utilise probablement quelques champs basiques
   (title, summary_long, pain_point, target_industries). Vérifie ce
   qu'elle utilise réellement.

3. Bonifie la fonction pour inclure les champs suivants quand ils
   existent dans le YAML (tous ne sont pas garantis sur tous les
   patterns) :

   a) title_fr (toujours)
   b) category (toujours)
   c) summary_short_fr
   d) summary_long_fr
   e) pain_point_fr
   f) solution_summary_fr
   g) target_industries (concaténés)
   h) target_business_sizes (concaténés)
   i) high_priority_segments (concaténés)
   j) typical_capabilities (concaténés)
   k) Pour les outils Tier 1 uniquement : leur `name` et `target_segment_fr`
      concaténés
   l) deployment_modes : leur `name_fr` et `description_fr` concaténés

   Le format de sortie doit être un texte structuré clairement
   séparé par sections avec des titres en français pour aider
   Voyage-3 à comprendre la sémantique. Quelque chose comme :

   ```
   TITRE : <title_fr>
   CATÉGORIE : <category>

   RÉSUMÉ : <summary_short_fr>

   DESCRIPTION : <summary_long_fr>

   PROBLÈME TYPE : <pain_point_fr>

   SOLUTION : <solution_summary_fr>

   INDUSTRIES CIBLES : <target_industries joined>
   TAILLES CIBLES : <target_business_sizes joined>
   SEGMENTS PRIORITAIRES : <high_priority_segments joined>

   CAPACITÉS : <typical_capabilities joined>

   MODES DE DÉPLOIEMENT : <deployment_modes name_fr + description_fr>

   OUTILS PRINCIPAUX : <tier 1 tools name + target_segment_fr>
   ```

4. Garde la robustesse : si un champ est absent dans le YAML, ne
   crashe pas — saute simplement la section correspondante.

5. Limite la longueur du texte à ~6000 caractères pour rester dans
   les limites de Voyage-3 (16 000 tokens max, ~64K caractères en
   théorie, mais on garde une marge). Tronque proprement si nécessaire
   en gardant les sections les plus importantes (titre, résumé, problème,
   solution, industries).

6. Ajoute un log informatif : pour chaque pattern, log le nombre de
   caractères de l'embedding_source généré, pour que Christian puisse
   vérifier que la bonification fonctionne.

7. Ne touche PAS au reste du script (logique d'upsert Supabase, appel
   Voyage). Juste la fonction `buildEmbeddingSource`.

8. Affiche le diff de tes modifications avant de continuer.
```

**Critère de réussite** :
- La fonction `buildEmbeddingSource` est bonifiée
- Les modifications respectent la robustesse (gestion des champs absents)
- Aucune autre partie du script n'est modifiée
- Commit avec message clair

---

## Étape 3 — Lancer le re-seed des patterns

**Objectif** : exécuter le script seed-patterns.js modifié sur la
nouvelle librairie de 10 patterns, en upsert (les 5 existants seront
mis à jour, les 5 nouveaux seront insérés).

**Manipulation à demander à Claude Code** :

```
ÉTAPE 3 : Re-seed des 10 patterns

Cette étape exécute le script en mode upsert. Les 5 patterns déjà
en DB seront mis à jour (nouvel embedding, nouveau contenu), les 5
nouveaux seront insérés.

1. Vérifie que les 10 fichiers YAML sont bien dans patterns/ :
   ls patterns/*.yaml | wc -l    (doit retourner 10)

2. Vérifie les variables d'environnement :
   - VOYAGE_API_KEY est défini
   - SUPABASE_URL est défini
   - SUPABASE_SERVICE_ROLE_KEY est défini

3. Lance le script en mode normal :
   npm run seed:patterns

4. Pendant l'exécution, vérifie les logs :
   - Chaque pattern affiche le nombre de caractères d'embedding_source
     (doit être entre 1500 et 6000 typiquement)
   - Chaque pattern affiche un message de succès ("✅ Inséré" ou "✅ Mis à jour")
   - Aucune erreur Voyage AI ou Supabase

5. À la fin, le script doit afficher :
   ✅ Succès : 10
   ❌ Échecs : 0

6. Si des erreurs surviennent :
   - Erreur YAML parse → identifier le pattern fautif et signaler à Christian
   - Erreur Voyage AI quota → patienter 60s et relancer
   - Erreur Supabase → vérifier les RLS policies sur la table patterns
   - Erreur dimensions vector → vérifier que la table a bien VECTOR(1024)
```

**Manipulation à faire par Christian** (post-Claude Code) :

Vérifier dans Supabase SQL Editor :

```sql
SELECT id, title_fr,
       vector_dims(embedding) as dims,
       LENGTH(embedding_source) as source_chars,
       updated_at
FROM patterns
ORDER BY id;
```

Doit retourner 10 lignes :
- 10 IDs distincts
- `dims` = 1024 pour toutes
- `source_chars` entre 1500 et 6000
- `updated_at` récent (datetime de la session 2F)

**Critère de réussite** :
- Script termine avec 10 succès, 0 échec
- Vérification SQL retourne 10 lignes valides
- Tous les patterns ont un embedding non-null en 1024 dimensions

---

## Étape 4 — Créer le script seed-sector-profiles.js

**Objectif** : nouveau script qui fait pour les profils sectoriels
ce que `seed-patterns.js` fait pour les patterns.

**Fichier à créer** : `scripts/seed-sector-profiles.js`

**Manipulation à demander à Claude Code** :

```
ÉTAPE 4 : Création du script seed-sector-profiles.js

1. Étudie la structure de `scripts/seed-patterns.js` (qu'on vient de
   modifier à l'Étape 2). Le nouveau script va beaucoup s'en inspirer.

2. Crée `scripts/seed-sector-profiles.js` qui :

   a) Lit tous les fichiers YAML dans `sector-profiles/` (pas
      `patterns/` cette fois)

   b) Pour chaque profil, valide que :
      - Le champ `type` est égal à 'profil-sectoriel'
      - Les champs requis sont présents : id, title_fr, version
      - Le champ `target_industries` OU un équivalent existe pour
        construire `industry_keywords` (voir d ci-dessous)

   c) Construit un `embedding_source` similaire à celui des patterns
      mais adapté au format profil sectoriel (les noms de champs
      diffèrent — voir le YAML d'exemple `profil-sectoriel-courtage-
      immobilier-qc.yaml`). Sections à inclure :

      ```
      SECTEUR : <title_fr>
      SEGMENT PRIMAIRE : <primary_segment_fr>

      PERSONA DU PROFESSIONNEL : <courtier_persona_fr> (ou champ équivalent)

      CADRE RÉGLEMENTAIRE : <regulatory_framework names + descriptions courtes>

      ÉCOSYSTÈME D'OUTILS MÉTIER : <industry_specific_tools names>

      OUTILS IA SPÉCIFIQUES : <ai_specific_tools tier 1 + tier 2 names>

      PAIN POINTS : <sector_specific_pain_points pain_fr concaténés>

      KPIs SECTORIELS : <sectoral_kpis aplatis>

      RISQUES SECTORIELS : <sector_risks title_fr concaténés>
      ```

      Limite à ~6000 caractères comme pour les patterns.

   d) Construit le tableau `industry_keywords` à partir de
      plusieurs sources dans le YAML, en dédupliquant :
      - `primary_segment_fr` : extraire les mots-clés évidents
      - Si présent : `target_industries` (mais le profil immobilier
        n'a pas ce champ, il a `primary_segment_fr` + `secondary_segments_fr`)
      - Pour le profil immobilier spécifiquement, hardcode les
        valeurs minimales : ['courtage-immobilier', 'agent-immobilier',
        'courtier-immobilier', 'immobilier', 'agence-immobiliere',
        'courtier-residentiel']
      - Note : à terme, ajouter un champ `industry_match_keywords`
        explicite dans le YAML serait plus propre, mais pour le MVP
        on extrait/hardcode

   e) Génère l'embedding via Voyage-3 (model='voyage-3',
      inputType='document', dimensions=1024) — exactement comme
      pour les patterns.

   f) Upsert dans la table `sector_profiles` avec :
      - id (du YAML)
      - content (YAML converti en JSON)
      - title_fr
      - type
      - version
      - language
      - industry_keywords (tableau construit en d)
      - embedding_source
      - embedding

   g) Logs informatifs : pour chaque profil, afficher l'id,
      les industry_keywords, le nombre de caractères d'embedding_source.

3. Ajoute la commande npm dans package.json :
   "seed:sector-profiles": "node scripts/seed-sector-profiles.js"

4. Affiche le contenu du nouveau script et les modifs package.json
   avant de continuer.
```

**Critère de réussite** :
- Le fichier `scripts/seed-sector-profiles.js` est créé
- Il suit la même structure que `seed-patterns.js`
- La commande npm est ajoutée
- Aucun bug syntaxique (un `node --check scripts/seed-sector-profiles.js`
  passe)

---

## Étape 5 — Lancer le seed des profils sectoriels

**Objectif** : exécuter le nouveau script et vérifier que le profil
sectoriel immobilier est bien en DB avec son embedding.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 5 : Lancer le seed du profil sectoriel immobilier

1. Vérifie que sector-profiles/ contient bien 1 fichier :
   ls sector-profiles/*.yaml | wc -l    (doit retourner 1)

2. Lance le script :
   npm run seed:sector-profiles

3. Vérifie les logs :
   - 1 profil traité
   - industry_keywords affichés (doivent contenir au minimum
     'agent-immobilier' et 'courtier-immobilier')
   - embedding_source entre 1500 et 6000 caractères
   - Message de succès final

4. Si erreur : noter le message exact et débugger.
```

**Manipulation à faire par Christian** (post-Claude Code) :

Vérifier dans Supabase SQL Editor :

```sql
SELECT id, title_fr,
       vector_dims(embedding) as dims,
       array_length(industry_keywords, 1) as nb_keywords,
       industry_keywords,
       LENGTH(embedding_source) as source_chars
FROM sector_profiles;
```

Doit retourner 1 ligne :
- id : `secteur-courtage-immobilier-qc-residentiel`
- dims : 1024
- nb_keywords : au moins 4
- industry_keywords contient `agent-immobilier`, `courtier-immobilier`,
  `immobilier`
- source_chars entre 1500 et 6000

Tester ensuite le matching déterministe :

```sql
SELECT * FROM match_sector_profile_by_industry('agent-immobilier');
```

Doit retourner le profil immobilier avec `match_strength = 1`.

```sql
SELECT * FROM match_sector_profile_by_industry('plomberie');
```

Doit retourner 0 lignes (aucun profil ne match « plomberie »).

**Critère de réussite** :
- Script termine avec succès
- 1 ligne en DB avec dims = 1024 et industry_keywords pertinents
- Le matching déterministe fonctionne pour les industries immobilières
- Le matching retourne vide pour les industries hors immobilier

---

## Étape 6 — Tests de validation du matching sémantique des patterns

**Objectif** : valider que le re-seed n'a pas dégradé la qualité du
matching sémantique pour les patterns existants, et que les nouveaux
patterns sont bien matchés sur leurs cas d'usage typiques.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 6 : Tests de matching sémantique

1. Dans la console Node ou via un petit script test, fait l'appel
   suivant pour chaque test :

   - Générer l'embedding d'une query via Voyage-3 (inputType='query'
     cette fois, pas 'document')
   - Appeler la RPC match_patterns dans Supabase avec cet embedding
   - Vérifier que le top-1 ou top-3 contient le pattern attendu

2. Voici la batterie de tests à faire — pour chaque, le pattern_id
   attendu en top-3 (et idéalement top-1) :

   Test A — Patterns existants (doivent toujours fonctionner) :
   - Query : "Je suis plombier et je rate trop d'appels"
     Top-1 attendu : ai-voice-receptionist
   - Query : "Je veux un chatbot sur mon site web pour qualifier les visiteurs"
     Top-1 attendu : ai-text-chatbot-multichannel
   - Query : "Mes clients ont du mal à prendre rendez-vous, je perds des occasions"
     Top-1 attendu : ai-appointment-scheduling
   - Query : "Je passe trop de temps à rédiger du contenu pour les réseaux sociaux"
     Top-1 attendu : ai-marketing-content-creation
   - Query : "Ma boîte courriel déborde, je ne sais plus où donner de la tête"
     Top-1 attendu : ai-email-management

   Test B — Nouveaux patterns (validation primaire) :
   - Query : "Je passe des soirées à monter mes devis et factures à la main"
     Top-1 attendu : ai-quote-invoice-automation (006)
   - Query : "Mes réunions client durent une heure et je n'ai jamais le temps de prendre des notes"
     Top-1 attendu : ai-meeting-transcription-summary (007)
   - Query : "Je gère trois restaurants, le recrutement me prend tout mon temps"
     Top-1 attendu : ai-hr-recruitment-automation (008)
   - Query : "J'ai des données partout dans mes fichiers Excel, je ne vois plus rien"
     Top-1 attendu : ai-data-dashboards (009)
   - Query : "Mes clients me posent toujours les mêmes questions, ça épuise mon équipe support"
     Top-1 attendu : ai-customer-support-helpdesk (014)

   Test C — Cas immobilier (intégration profil sectoriel) :
   - Query : "Je suis courtier immobilier, je perds des leads quand je suis en visite"
     Top-3 attendus : ai-voice-receptionist en haut, possiblement
     ai-text-chatbot-multichannel ou ai-appointment-scheduling

3. Pour chaque test, log :
   - La query
   - Le top-3 retourné avec leurs scores de similarité
   - Le résultat : ✅ si le pattern attendu est en top-3, ❌ sinon

4. À la fin, log un résumé :
   "Tests passés : X / 11"

5. Si certains tests échouent :
   - Vérifier que l'embedding_source est suffisamment riche pour
     ces patterns (hint: ouvrir le YAML et voir si pain_point_fr
     est bien évocateur du cas testé)
   - Ne PAS modifier les patterns dans cette session — signaler
     les échecs à Christian pour qu'il décide d'un plan d'action
```

**Critère de réussite** :
- Au moins 9/11 tests réussissent (top-1 ou top-3)
- Les échecs sont documentés avec analyse
- Aucune modification de pattern faite dans cette session

---

## Étape 7 — Vérification finale et nettoyage

**Objectif** : s'assurer que tout est cohérent en DB et que le repo
est propre.

**Manipulation à demander à Claude Code** :

```
ÉTAPE 7 : Vérification finale et nettoyage

1. Liste les fichiers YAML présents dans patterns/ et sector-profiles/.
   Confirme :
   - patterns/ : 10 fichiers
   - sector-profiles/ : 1 fichier

2. Supprime les fichiers temporaires éventuels :
   - Le dossier `incoming-yaml/` (créé à l'Étape 0) peut être supprimé
   - Tout fichier .bak ou .old qui aurait pu être créé

3. Vérifie que le .gitignore inclut bien :
   - .env (déjà existant probablement)
   - node_modules/
   - Pas de référence à patterns/ ou sector-profiles/ — ces dossiers
     DOIVENT être commités

4. Affiche le statut git complet (git status) pour validation.

5. Suggère à Christian un message de commit pour clôturer la session :
   "session-2f: re-seed library with 10 patterns + 1 sector profile (immobilier QC)"
```

**Manipulation à faire par Christian** :

Dernière vérification SQL globale :

```sql
SELECT
  (SELECT COUNT(*) FROM patterns) as nb_patterns,
  (SELECT COUNT(*) FROM patterns WHERE embedding IS NULL) as patterns_sans_embedding,
  (SELECT COUNT(*) FROM sector_profiles) as nb_sector_profiles,
  (SELECT COUNT(*) FROM sector_profiles WHERE embedding IS NULL) as sector_profiles_sans_embedding;
```

Doit retourner :
- nb_patterns : 10
- patterns_sans_embedding : 0
- nb_sector_profiles : 1
- sector_profiles_sans_embedding : 0

**Critère de réussite** :
- Repo propre, fichiers temporaires supprimés
- DB cohérente : 10 patterns et 1 sector_profile, tous avec embedding
- Commit final fait avec message clair

---

## Pièges fréquents et solutions

- **Erreur Voyage AI quota dépassé** : le free tier Voyage limite à
  3M tokens/mois. 10 patterns + 1 sector_profile = ~50K tokens
  total. Aucun risque sauf si l'API key est partagée avec d'autres
  projets. Vérifier sur dashboard Voyage si erreur.

- **Erreur dimensions vector mismatch** : si la table `patterns`
  ou `sector_profiles` n'est pas en VECTOR(1024), l'INSERT échoue.
  Vérifier avec `\d patterns` dans psql ou via Supabase UI. Si
  besoin :
  ```sql
  ALTER TABLE patterns ALTER COLUMN embedding TYPE VECTOR(1024);
  ```

- **Erreur YAML parse sur un pattern** : le suffixe `-mod` a peut-être
  laissé une duplication de clé ou cassé l'indentation. Lancer
  `python3 -c "import yaml; yaml.safe_load(open('patterns/<file>'))"`
  pour identifier la ligne fautive.

- **Le matching sémantique retourne des résultats incohérents pour un
  nouveau pattern** : c'est probablement que `embedding_source` est
  trop pauvre pour ce pattern. Solution : enrichir le YAML lui-même
  (pain_point_fr plus évocateur, target_industries plus précises),
  et relancer `npm run seed:patterns`. Ne PAS modifier
  `buildEmbeddingSource` pour un cas particulier — c'est un signal
  que le pattern lui-même mérite une bonification.

- **Le profil sectoriel n'apparaît pas en matching déterministe** :
  vérifier le tableau `industry_keywords` en DB. Si le tag testé
  (ex: 'courtier-immobilier') n'y est pas, c'est un bug du script
  `seed-sector-profiles.js` dans la construction du tableau.

- **Une RPC Supabase n'existe pas** : la migration de l'Étape 1 n'a
  pas été lancée. Demander à Christian d'exécuter le SQL.

---

## Ce qui n'est PAS dans cette session

Pour clarté sur le périmètre :

- **Pas d'intégration au Skill 1 du pipeline** : adapter le Skill 1
  pour qu'il consomme le profil sectoriel immobilier est une tâche
  séparée. Pour l'instant, le profil est en DB et la fonction RPC
  existe, mais le Skill 1 ne l'appelle pas encore. À traiter dans
  une session future (2G ou similaire).

- **Pas d'autres profils sectoriels** : seul l'immobilier est
  produit pour l'instant. Christian créera d'autres profils
  (cabinets dentaires, restaurants multi-sites, OBNL...) au fur et
  à mesure des besoins beta-tests.

- **Pas de modification de patterns** : si les tests de matching de
  l'Étape 6 révèlent des faiblesses, c'est documenté mais pas corrigé
  dans cette session.

- **Pas de tests automatisés** : les tests de l'Étape 6 sont manuels
  / ad-hoc. Une vraie suite de tests automatisés pour le matching
  sémantique est à prévoir dans une session future.

---

*Document rédigé le 26 avril 2026.*
*Pré-requis : Sessions 2A à 2E livrées et fonctionnelles.*
*Suite logique : Session 2G (intégration du profil sectoriel au Skill 1).*
