# État du projet 5PennyAi — Audit IA

*Dernière mise à jour : 25 avril 2026 (fin de Session 2C — interface admin de révision)*

Ce fichier sert d'ancrage pour que chaque nouvelle session Claude puisse
reprendre le projet là où on s'est arrêté, sans avoir à relire toute
l'historique des conversations.

---

## Où on en est

**Sessions complétées** :

- ✅ Session 1 — Scaffold initial (React 19 + Vite + TypeScript + Tailwind + Supabase + intégrations Anthropic/Voyage)
- ✅ Session 2A — Formulaire d'intake (7 écrans, 19 questions, persistence progressive, reprise magic link, cron Vercel)
- ✅ Session 2B — Pipeline des 5 skills (orchestration SSE, matching sémantique pgvector, écran de progression, 2 courriels de fin de parcours)
- ✅ Session 2B-bis — Enrichissement éditorial (Portrait sectoriel via web_search, estimations chiffrées personnalisées, livrables actionnables intégrés au rapport)
- ✅ **Session 2C — Interface admin de révision** (auth mot de passe, liste filtrée, page détail 7 onglets, édition inline reviewer_notes, actions admin, page rapport publique via JWT)

**Audits complets validés** : 2 personas radicalement différents

1. **Sophie Tremblay** — Clinique dentaire, équipe 6-20, B2C, santé/Loi 25, Québec
2. **Marc Dubois** — Cabinet d'avocat solo, B2B, juridique/secret professionnel, Québec, taux 350 $/h

Les deux audits produisent des rapports denses (12-15 pages), personnalisés,
sectoriellement adaptés, avec banque de 15 prompts spécifiques au métier,
politique Loi 25 pré-remplie, et tableau de bord KPI sur 90 jours.

**Évaluation produit actuelle** : 8,5/10 sur la cible. Vendable à 199-249 $.

**Coût mesuré par audit** : ~3,50-5 $ US en Opus 4.7 partout.

**Test bout-en-bout 2C réalisé** : audit Sophie traversé du formulaire au
rapport public via l'admin, courriel client logué en console, page
publique accessible via lien signé, impression PDF navigateur fonctionnelle
(le PDF résultant tient lieu de livrable provisoire en attendant la 2D).

---

## Positionnement produit (validé après tests sur 2 personas)

**Scénario B confirmé** : audit enrichi à 149-299 $ CAD comme produit
complet autonome.

Le produit n'est ni un lead magnet gratuit, ni un mini-audit premium à
500 $+. C'est un produit fini qui justifie son prix par la densité du
livrable (15 prompts personnalisés, politique Loi 25 sectorielle, tableau
de bord KPI), la rigueur méthodologique (sources citées, facteurs de
prudence appliqués, mises en garde explicites) et le ton adapté au métier
du client.

**Décision pricing en suspens** : 149, 199, 249 ou 299 $ ? À trancher
avant le lancement payant, pas urgent. L'instinct actuel pointe plutôt
vers 199-249 $ après les premiers beta-tests gratuits.

---

## 🎯 Prochaine session : Session 2D — Export DOCX automatisé

**Statut** : priorité actuelle. Dernier bloqueur structurel avant les
beta-tests sérieux.

**Pourquoi maintenant** : la 2C livre le rapport via une page web
publique stylée, et l'impression navigateur produit déjà un PDF
acceptable. Mais pour un produit à 199-249 $ CAD, un fichier DOCX
attaché au courriel reste l'attente standard du marché PME québécois —
les clients vont vouloir le déposer dans leur GED, l'imprimer en cabinet,
ou le faire annoter par leur équipe.

**Scope de la Session 2D** :

1. **Générateur DOCX côté serveur** basé sur le script de référence
   `build-report.js` produit manuellement le 25 avril 2026 (disponible
   dans l'historique de conversation Claude). Réutilise la même
   structure visuelle (Navy 600 + Orange 500), les callouts cream,
   les tableaux, etc.

2. **Endpoint `/api/admin/audits/[id]/generate-docx`** déclenché soit
   automatiquement à l'approbation, soit à la demande depuis l'admin
   pour régénérer.

3. **Intégration au flux `approve-and-send`** existant :
   - Génère le DOCX juste avant l'envoi du courriel
   - Stocke le fichier dans Supabase Storage (bucket privé)
   - Joint le DOCX au courriel client (en plus du lien vers la page
     publique qui reste accessible 90 jours)

4. **Conversion PDF optionnelle** via LibreOffice pour les clients qui
   préfèrent. À évaluer : LibreOffice headless dans une fonction
   serverless ou service externe ? Probablement plus simple de laisser
   le client convertir lui-même via Word — à trancher pendant la 2D.

5. **Bouton "Télécharger DOCX" dans l'admin** sur la page détail pour
   que Christian puisse aussi récupérer le fichier sans devoir relancer
   l'envoi client.

**Effort estimé** : 4-6 étapes Claude Code, 2-3 heures. Plus simple que
la 2C parce que le script de référence existe et que le scope est focal.

---

## Petits chantiers à coupler avec la 2D ou à régler en marge

- **Mapping des libellés de secteur** : actuellement la liste admin
  affiche `services_professionnels`, `sante_bien_etre` en snake_case
  brut. Ajouter un mapping vers libellés humains (« Services
  professionnels », « Santé et bien-être »). 5 minutes.

- **Nom complet client dans la liste admin** : actuellement seul le
  prénom s'affiche. Ajouter le nom de famille s'il existe dans
  `intake_data` pour distinguer deux clients du même prénom. 5 minutes.

- **Affirmation de révision conditionnelle dans le rapport** : la phrase
  finale « Ce rapport a fait l'objet d'une révision humaine par Christian
  Couillard avant transmission » apparaît dans tous les rapports envoyés.
  Pour être strictement honnête, la rendre conditionnelle au fait que
  `reviewed_at` est rempli ET que `admin_notes_global` ou des notes de
  section existent. Sans urgence — pour les beta-tests réels Christian
  fera toujours une vraie révision, donc le problème ne se pose pas en
  pratique. À garder dans le backlog comme dette d'honnêteté.

---

## Sessions ultérieures planifiées

**Beta-tests réels** (5-10 vrais clients) : une fois la 2D livrée, faire
des audits gratuits ou très bas prix pour valider le produit avec de
vrais utilisateurs. Itérer sur les prompts/livrables/UI selon leurs
retours. C'est cette étape qui débloque le développement du Clarifying
Agent (cf. Jalon v2).

**Configuration Brevo** : à faire avant les beta-tests, pour que les
courriels partent réellement vers les clients au lieu d'être loggés en
console. Domaine `5pennyai.com` à vérifier chez Brevo, ajustement des
variables `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_FROM_CLIENT` (les
noms `RESEND_*` sont conservés bien qu'on utilise Brevo, l'abstraction
est dans le code).

**Session 2E — Stripe / paiement** : déplacement du CTA "Lancer mon
audit" derrière un paywall après validation par les beta-tests.

**Lancement public soft** : annonce sur les canaux existants, premiers
clients payants au prix défini.

**Session 3 — Patterns sectoriels supplémentaires** : ajout de patterns
dédiés pour les secteurs sous-représentés détectés pendant les beta-tests.
Actuellement 5 patterns ; cibler 12-15 patterns à terme.

**Session 4 — Clarifying Agent (chatbot v2)** : voir section dédiée plus bas.

---

## Jalon v2 majeur — Clarifying Agent (chatbot post-formulaire)

**Statut** : engagement ferme, à implémenter après les 5-10 premiers
audits beta réels.

**Concept** : après que le client ait rempli le formulaire statique
(19 questions, inchangé), un bot analyse ses réponses et pose 2-5
questions de suivi ciblées avant de lancer le pipeline des 5 skills.

**Pourquoi attendre les beta-tests** : aujourd'hui on ne sait pas
quelles sont les bonnes questions de clarification à poser. Après 5-10
audits réels où Christian aura noté "ça aurait été utile de savoir X",
on aura une liste concrète qui nourrira le prompt du Clarifying Agent
beaucoup mieux que n'importe quelle anticipation théorique.

**Architecture prévue** :
- **Skill 0 — Clarifying Agent** : analyse intake_data, produit 2-5
  questions de clarification ciblées avec leur justification interne
- **Skill 0-bis — Conversation Manager** : gère la conversation
  multi-tours avec le client, commente brièvement les réponses, décide
  quand s'arrêter
- Nouvelle table `clarification_sessions` liée à `audits`
- Nouvelle route `/audit/clarification/[auditId]` avec UI chat
- Les skills 1-5 consomment maintenant intake_data + clarification_answers
- Modèle : Sonnet 4.6 suffit (rapide, peu cher, bon en conversationnel)
- Coût marginal par audit : ~0,15-0,25 $ US

**Principes de design du bot** :
- Ton facilitateur, jamais expert ou consultatif
- Pas plus de 5 questions, pour respecter le temps du client
- Ne creuse jamais sur le personnel (conflits, relations, santé mentale)
- N'invente pas de sujets hors de ce que le client a écrit
- Ne donne pas de conseils pendant le chat (c'est le rôle du rapport)
- Bouton "Tout est clair, lancez mon audit" toujours visible pour skip

**Effort estimé** : 3-4 sessions Claude Code, 1-2 semaines calendaires.

**Timeline cible** : 2-3 mois après le premier audit beta.

---

## Optimisation à considérer avant la production

**Switch Sonnet/Opus intelligent** : passer les Skills 1-4 en Sonnet 4.6
(structurels) et garder Skill 5 en Opus 4.7 (qualité éditoriale du
rapport final visible au client). Coût par audit passe de ~3,50 $ US à
~1,30 $ US sans perte de qualité visible. À valider en comparant un
audit Opus vs Sonnet/Opus sur un même persona avant le lancement.

---

## Configuration technique actuelle

- **Runtime Vercel** : Node serverless avec `maxDuration: 300` (Vercel
  Pro souscrit par Christian).
- **Modèles IA** : `claude-opus-4-7` sur les 5 skills (pas de paramètre
  `temperature`, retiré après découverte de la dépréciation Opus 4.7).
- **Max tokens par skill** : 1 → 6000, 2 → 12000, 3 → 8000, 4 → 8000,
  5 → 20000 (ajustés au tokenizer Opus 4.7 ; valeurs effectives en
  prod, valident le rendu observé sur Sophie et Marc).
- **Web search** : activé sur Skill 1 depuis 2B-bis pour les benchmarks
  sectoriels (budget 5 requêtes max).
- **Embeddings** : Voyage-3, dimension 1024, stockés dans
  `patterns.embedding` (VECTOR(1024)). Index `match_patterns_voyage3`
  créé.
- **Fallback dev courriels** : actif tant que `RESEND_API_KEY` est
  absente. Les courriels sont loggés dans la console au lieu d'être
  envoyés.
- **Cron Vercel** : `/api/cron/send-resume-emails` toutes les 15
  minutes, seuil d'inactivité 30 min, protégé par `CRON_SECRET`.
- **Endpoint admin (legacy v1)** : `/api/admin/costs?days=N`, protégé
  par `ADMIN_API_SECRET` (Bearer token). À conserver pour l'instant,
  l'admin v2 (2C) ne le remplace pas — il sera intégré à la sidebar
  dans une session future quand on attaquera le suivi des coûts dans
  l'UI.

---

## Architecture admin (Session 2C)

**Authentification** : mot de passe unique côté serveur (`ADMIN_PASSWORD`)
+ cookie de session signé (JWT, durée 12h par défaut). Rate limiting
5 tentatives par IP par 15 min. Pas de Supabase Auth, pas de
multi-utilisateurs.

**Routes admin créées** :
- `/admin/login` — saisie mot de passe
- `/admin/audits` — liste avec filtres statut, recherche, tri, pagination
- `/admin/audits/:id` — page détail avec 7 onglets (Intake, Contexte,
  Opportunités, Risques, Stack, Rapport final, Notes & historique)

**Routes publiques créées** :
- `/rapport/:token` — page rapport publique accessible via JWT signé
  (audience `public_report`, expire 90 jours), réutilise le composant
  `ReportView` de l'admin avec wrapper visuel client.

**Endpoints API créés** :
- `POST /api/admin/auth/login` / `POST /api/admin/auth/logout`
- `GET /api/admin/audits/list` (filtres, tri, pagination)
- `GET /api/admin/audits/:id/get` (audit + historique des events)
- `POST /api/admin/audits/:id/notes/save` (auto-save reviewer_notes par
  section ou note globale)
- `POST /api/admin/audits/:id/request-changes` (raison obligatoire)
- `POST /api/admin/audits/:id/reject` (raison + confirmation)
- `POST /api/admin/audits/:id/approve-and-send` (génère token public,
  envoie courriel client, statut → delivered)
- `POST /api/audit/:id/rerun` (relance pipeline depuis changes_requested)
- `GET /api/public/report/:token` (validation JWT, retourne audit en
  lecture seule sans auth)

**Schéma DB ajouté** :
- Colonnes sur `audits` : `admin_notes_global`, `reviewed_at`,
  `reviewed_by`, `approved_at`, `delivered_at`, `public_report_token`,
  `public_report_token_expires_at`
- Nouvelle table `audit_review_events` (id, audit_id, event_type,
  payload jsonb, actor_email, created_at) avec index sur
  `(audit_id, created_at DESC)`
- Statuts du workflow : `draft → running → pending_review →
  (approved | changes_requested | rejected) → delivered`

**Workflow de révision** : Christian se connecte, voit la liste filtrée
sur `pending_review`, ouvre un audit, navigue les 7 onglets en annotant
au fil de la lecture (auto-save). Décide ensuite : approuver et envoyer
(courriel client + lien public + statut delivered), demander des modifs
(raison + relance pipeline), ou rejeter (raison + confirmation).

---

## Variables d'environnement requises

Voir `.env.example` pour la liste complète. Variables critiques :

```
ANTHROPIC_API_KEY
VOYAGE_API_KEY
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL=christian.couillard@5pennyai.com
ADMIN_NAME=Christian Couillard

# Auth admin v2 (Session 2C)
ADMIN_PASSWORD               # mot de passe long, jamais commit
ADMIN_SESSION_SECRET         # 32+ chars pour signer le cookie
ADMIN_SESSION_DURATION_HOURS=12   # défaut 12h

# Legacy admin v1 (endpoint coûts)
ADMIN_API_SECRET

# Tokens
RESUME_TOKEN_SECRET          # signe les tokens d'intake ET de rapport public
CRON_SECRET
INTERNAL_HOOK_SECRET

# Courriels (Brevo derrière l'abstraction "RESEND_*")
RESEND_API_KEY               # vide en dev = fallback console
RESEND_FROM                  # ex: "5PennyAi <noreply@5pennyai.com>"
RESEND_FROM_CLIENT           # expéditeur client plus chaleureux

# URLs
PUBLIC_BASE_URL              # http://localhost:5173 en local
```

---

## Courriel expéditeur : statut

Le domaine `5pennyai.com` n'est **pas encore configuré** chez un
fournisseur d'envoi de courriels. Décision prise : utiliser **Brevo**
(gratuit, 300 courriels/jour, domaines illimités) plutôt que payer
Resend Pro (20 $/mois) ou réutiliser le domaine pennyseo.ai déjà sur
Resend. À configurer avant les beta-tests réels (probablement après
la Session 2D).

En attendant : fallback dev actif, les courriels sont loggés sans
être envoyés. Ce mode a été utilisé pour valider le test bout-en-bout
de la 2C — courriel formaté visible en console, lien `/rapport/<token>`
cliquable depuis le terminal.

---

## Personas de test prêts à réutiliser

Pour valider la qualité d'un nouvel enrichissement ou changement
de configuration, ces personas peuvent être réinjectés rapidement :

**1. Sophie Tremblay** — Clinique dentaire, Québec, équipe 6-20, B2C,
santé. Volume 50-200 patients/mois, budget 2 000-5 000 $, voie B,
horizon 1-3 mois. Audit complet en DB, statut `delivered` après le
test bout-en-bout 2C.

**2. Marc Dubois** — Cabinet d'avocat solo, Québec, B2B + B2C, droit
civil/famille/succession. Volume 10-50 clients/mois, budget
2 000-5 000 $, voie B, horizon 1-3 mois, taux horaire 350 $/h.
Audit complet en DB, statut `pending_review` (peut servir de cas de
test pour la 2D ou pour rejouer un workflow admin).

**3. Julie Martin** (non testé encore) — Atelier Pivoine, e-commerce
de bijoux artisanaux au Québec, équipe 2-5, B2C, plus de 200 clients/mois,
budget 5 000-15 000 $, voie B. À utiliser pour tester un secteur
e-commerce/produits si pertinent avant ou pendant la 2D.

---

## Documents Word de référence générés

Pendant la session du 25 avril 2026, deux documents Word ont été
produits manuellement comme aperçu visuel du livrable final attendu :

- `audit-sophie-tremblay.docx` — 12-15 pages, design 5PennyAi
  (Navy 600 + Orange 500), structure complète avec callouts colorés,
  tableaux, banque de prompts, politique Loi 25, tableau de bord KPI.

- `audit-marc-dubois.docx` — même structure adaptée au juridique.

Le script de génération `build-report.js` est dans l'historique de
conversation et **servira de référence directe pour la Session 2D**.
À retrouver via `conversation_search` au démarrage de la 2D.

**Référence visuelle complémentaire** : le PDF
`Audit_IA___Clinique_dentaire_Sophie_Tremblay.pdf` produit par
impression navigateur de la page publique 2C (19 pages) montre que
le rendu HTML stylé est déjà très acceptable. Il servira de
benchmark visuel pour valider que le DOCX 2D ne régresse pas
(structure, ton, densité d'information).

---

## Instructions pour Claude (prochaine session)

Quand Christian démarre une nouvelle session, lis ce fichier pour
comprendre où on en est et ce qui est prévu ensuite. Les fichiers
référencés (`intake-form-v1.yaml`, `skills-prompts-v2.yaml`, instructions
Claude Code des sessions précédentes) sont tous dans les project files
et restent la source de vérité pour les détails techniques.

**Démarrage typique** :

- Si Christian dit "on continue" : il veut probablement attaquer la
  Session 2D (export DOCX). Valide avec lui avant de plonger.
- S'il veut faire un nouveau test d'audit : propose-lui Julie Martin
  (e-commerce, encore non testé) pour étendre la couverture.
- S'il veut configurer Brevo : c'est une session courte (vérification
  domaine, ajustement variables d'env, test d'envoi réel). Indépendante
  de la 2D mais probablement à faire juste après.
- S'il veut ajouter des patterns : c'est du travail éditorial, pas
  de Claude Code. Discute avec lui des secteurs prioritaires.
- S'il veut le chatbot : rappelle-lui que c'est explicitement reporté
  après les 5-10 premiers audits beta réels (cf. section Jalon v2).

**Ne propose pas de relancer un audit Sophie ou Marc** sauf si
Christian veut spécifiquement valider un changement. Les audits ont
déjà été faits et coûtent ~3,50 $ US chacun en Opus 4.7.
