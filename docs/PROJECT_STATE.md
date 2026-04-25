# État du projet 5PennyAi — Audit IA

*Dernière mise à jour : 25 avril 2026 (fin de Session 2B-bis, code only — tests runtime à compléter avec Christian)*

Ce fichier sert d'ancrage pour que chaque nouvelle session Claude puisse
reprendre le projet là où on s'est arrêté, sans avoir à relire toute
l'historique des conversations.

---

## Où on en est

**Sessions complétées** :

- ✅ Session 1 — Scaffold initial (React 19 + Vite + TypeScript + Tailwind + Supabase + intégrations Anthropic/Voyage)
- ✅ Session 2A — Formulaire d'intake (7 écrans, 19 questions, persistence progressive, reprise magic link, cron Vercel)
- ✅ Session 2B — Pipeline des 5 skills (orchestration SSE, matching sémantique pgvector, écran de progression, 2 courriels de fin de parcours)
- ✅ Session 2B-bis — Enrichissement éditorial v2 (Skills 1, 2, 5 enrichis ; web_search activé pour Skill 1 ; livrables actionnables personnalisés ; bump Skill 5 max_tokens à 20000 ; correction Christian Couillard). **Tests runtime (Sophie Tremblay + Maison Olive) à compléter avec Christian.**

**Premier audit complet réussi** : Sophie Tremblay, Clinique dentaire au Québec.
Qualité éditoriale validée. Coût mesuré : ~3,50 $ US par audit en Opus 4.7 partout
(v1). En v2, coût attendu ~3,80 $ US (web_search + Skill 5 plus dense). Durée
attendue ~6-10 minutes au lieu de 5-8 minutes.

---

## Positionnement produit (décidé à la fin de la Session 2B)

Le produit vise le **Scénario B** : audit enrichi à 149-299 $ CAD comme produit
complet autonome (densité x2 par rapport à la version actuelle).

Ce n'est pas un lead magnet gratuit. Ce n'est pas un mini-audit premium à 500 $+.
C'est un produit fini qui justifie son prix par la densité du livrable et la
personnalisation du contenu.

---

## Prochaine session : Session 2C (interface admin de révision)

**Objectif** : permettre à Christian de réviser, annoter et approuver les
audits en attente avant l'envoi au client.

**Travaux prévus** : liste + détail des audits en attente, approbation,
courriel de livraison post-approbation, authentification basique.

---

## Session 2B-bis (terminée code, tests runtime à faire)

**Objectif** : densifier le livrable pour qu'il soit en ligne avec le
positionnement choisi.

**Décisions prises d'avance** :

1. **Chiffres personnalisés — Approche C bonifiée** (décision révisée) :
   **pas de nouveaux champs ajoutés au formulaire.** À la place :
   - Modifier le helper_text de la question 10 ("time_consuming_tasks") pour
     pousser activement les clients à inclure des chiffres concrets (heures
     par semaine, nombre de clients/dossiers/transactions par mois, montants
     approximatifs).
   - Modifier les prompts des Skills 2 et 5 pour qu'ils utilisent activement
     les chiffres trouvés dans le texte libre quand ils sont présents, et
     qu'ils se replient sur des benchmarks sectoriels sourcés (via web_search
     Skill 1) quand ils ne le sont pas.

   **Raison du choix** : on ne sait pas encore quelles métriques sont
   pertinentes pour quels secteurs (pas assez d'audits réels). Ajouter des
   champs sectoriels maintenant serait sur-concevoir avant d'avoir des données.
   On réévaluera après 10-15 audits réels pour potentiellement introduire des
   questions sectorielles spécifiques (Session d'évolution formulaire v2, pas
   avant 3-6 mois).

2. **Livrables annexes — Option 2B** : le Skill 5 génère des livrables
   personnalisés dans le rapport (pas de templates génériques à part). Exemples :
   15 prompts Claude adaptés au secteur du client, template de politique de
   confidentialité Loi 25 pré-rempli pour sa situation, checklist spécifique
   au type d'entreprise.

3. **Benchmarks sectoriels — Option 3A** : activer `web_search` sur le
   Skill 1 (ou un nouveau Skill 1-bis) pour que Claude cherche 3-5 chiffres
   sectoriels réels à inclure dans le Portrait sectoriel. Les sources doivent
   être citées.

**Travaux prévus pour Session 2B-bis** :

- Enrichir le prompt du Skill 1 avec une section "Portrait sectoriel" nourrie
  par web_search (3-5 chiffres sectoriels réels sourcés).
- Enrichir le prompt du Skill 2 pour inclure une "estimation chiffrée
  personnalisée" par opportunité retenue, basée sur les chiffres trouvés
  dans le texte libre du client quand ils sont présents.
- Enrichir le prompt du Skill 5 avec une section "Livrables actionnables
  personnalisés" (15 prompts Claude sectoriels, template politique Loi 25
  pré-rempli, checklist spécifique au type d'entreprise).
- **Modifier uniquement le helper_text de la question 10 de intake-form-v1.yaml**
  pour pousser les chiffres concrets. Pas de nouveaux champs ajoutés au
  formulaire.
- Activer web_search dans `src/lib/ai/anthropic.ts` pour le Skill 1.
- Mettre à jour skills-prompts-v1.yaml → skills-prompts-v2.yaml (le YAML
  reste la source de vérité cohérente avec le code).
- Retester un audit avec un nouveau persona (non-clinique, ex: avocat ou
  e-commerce) pour valider que l'approche tient sur d'autres secteurs.

**Effort estimé** : 1 session Claude Code (8-10 étapes, 2-3h).

---

## Sessions suivantes planifiées

- **Session 2C** : Interface admin de révision (liste + détail des audits en
  attente, approbation, courriel de livraison au client post-approbation,
  authentification basique).
- **Session 2D** : Export DOCX/PDF du rapport final.
- **Session 2E** : Stripe / paiement (déplacement du CTA derrière paywall).
- **Session 3** : Ajout patterns #006 (devis/factures) et #007 (transcription
  réunions) avant élargissement sectoriel.

---

## Jalon v2 majeur — Clarifying Agent (chatbot post-formulaire)

**Statut** : engagement ferme de Christian, à implémenter en v2 du produit
après les 5-10 premiers audits beta.

**Concept** : après que le client ait rempli le formulaire statique (19
questions, inchangé), un bot analyse ses réponses et pose 2-5 questions
de suivi ciblées avant de lancer le pipeline des 5 skills. Le bot ne remplace
pas le formulaire, il le complète sur les zones qui méritent d'être creusées.

**Pourquoi post-formulaire et pas pre-formulaire** :
- Le formulaire fait ce qu'il fait bien : capturer l'info structurée rapidement
- Le chat fait ce qu'il fait bien : creuser contextuellement sur ce qui émerge
- Client garde le contrôle du rythme via le formulaire
- Périmètre du bot limité et prévisible (2-5 questions max)

**Pourquoi attendre les 5-10 premiers audits** :
Aujourd'hui on ne sait pas quelles sont les bonnes questions de clarification
à poser. Après 5-10 audits réels où Christian aura noté "ça aurait été utile
de savoir X", on aura une liste concrète qui nourrira le prompt du Clarifying
Agent beaucoup mieux que n'importe quelle anticipation théorique.

**Architecture prévue** :
- **Skill 0 — Clarifying Agent** : analyse intake_data, produit 2-5 questions
  de clarification ciblées avec leur justification interne
- **Skill 0-bis — Conversation Manager** : gère la conversation multi-tours
  avec le client, commente brièvement les réponses, décide quand s'arrêter
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

**Types de relances pertinentes identifiées à l'avance** :
- Répartition/granularité sur les volumes déclarés
- Précisions chiffrées optionnelles (no-shows, panier moyen, etc.)
- Clarification d'incohérences (ex: "accompagnement léger" + "délégation complète")
- Contexte sur la clientèle (âge, préférences, habitudes tech)
- Contraintes non déclarées (associé, saisonnalité, dépendances clients)

**Effort estimé** : 3-4 sessions Claude Code, 1-2 semaines calendaires

**Prérequis pour démarrer cette session** :
1. Avoir livré 5-10 audits beta avec la v1
2. Mini-session d'analyse où Christian liste pour chaque audit les questions
   de clarification qui auraient amélioré le résultat
3. Cette liste nourrit le prompt du Skill 0 avec des heuristiques concrètes

**Timeline cible** : 2-3 mois après le premier audit beta, cohérent avec le
plan 2-3 ans du projet.

---

## Points de fiction résiduels (petits fixes à faire un jour)

- Vérifier que les `pattern_id` référencés dans les rapports existent bien
  dans la table `patterns` Supabase (particulièrement
  `ai-appointment-scheduling` et `ai-email-management`).
- Le tracking de coût des appels `web_search` (~0,01 $ US/recherche)
  n'est pas encore intégré à `/api/admin/costs`. Sous-estimation marginale
  attendue tant que ce n'est pas branché.

---

## Optimisation à considérer avant la production

**Switch Sonnet/Opus intelligent** : passer les Skills 1-4 en Sonnet 4.6
(structurels) et garder Skill 5 en Opus 4.7 (qualité éditoriale du rapport
final visible au client). Coût par audit passe de ~3,50 $ US à ~1,30 $ US
sans perte de qualité visible. À valider en comparant un audit Opus vs
Sonnet/Opus sur un même persona.

---

## Configuration technique actuelle

- **Runtime Vercel** : Node serverless avec `maxDuration: 300` (Vercel Pro
  requis, déjà souscrit par Christian).
- **Modèles IA** : `claude-opus-4-7` sur les 5 skills (pas de paramètre
  temperature, retiré après découverte de la dépréciation Opus 4.7).
- **Max tokens par skill** : 1 → 6000, 2 → 12000, 3 → 8000, 4 → 8000,
  5 → 20000 (Skill 5 bumpé en v2 pour absorber les livrables actionnables ;
  les autres ajustés +20-35% pour le nouveau tokenizer Opus 4.7).
- **Outils Anthropic** : Skill 1 utilise `web_search_20250305` (max_uses=5)
  pour le portrait sectoriel chiffré. Les autres skills n'ont pas d'outils.
- **Embeddings** : Voyage-3, dimension 1024, stockés dans `patterns.embedding`
  (VECTOR(1024)). Index `match_patterns_voyage3` créé.
- **Fallback dev courriels** : actif tant que `RESEND_API_KEY` est absente.
  Les courriels sont loggés dans la console au lieu d'être envoyés.
- **Cron Vercel** : `/api/cron/send-resume-emails` toutes les 15 minutes,
  seuil d'inactivité 30 min, protégé par `CRON_SECRET`.
- **Endpoint admin** : `/api/admin/costs?days=N`, protégé par
  `ADMIN_API_SECRET` (Bearer token).

---

## Variables d'environnement requises

Voir `.env.example` pour la liste complète. Variables critiques :

```
ANTHROPIC_API_KEY
VOYAGE_API_KEY
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL=christian.couillard@5pennyai.com
ADMIN_NAME=Christian Couillard
CRON_SECRET
ADMIN_API_SECRET
RESEND_API_KEY  # à remplir quand Resend/Brevo sera configuré
EMAIL_FROM=noreply@5pennyai.com  # domaine à vérifier chez le fournisseur
INTERNAL_HOOK_SECRET
RESUME_TOKEN_SECRET
PUBLIC_BASE_URL
```

---

## Courriel expéditeur : statut

Le domaine `5pennyai.com` n'est **pas encore configuré** chez un fournisseur
d'envoi de courriels. Décision prise : utiliser **Brevo** (gratuit, 300
courriels/jour, domaines illimités) plutôt que payer Resend Pro (20 $/mois)
ou réutiliser le domaine pennyseo.ai déjà sur Resend. À configurer quand
les premiers beta-tests avec de vrais clients approcheront.

En attendant : fallback dev actif, les courriels sont loggés sans être envoyés.

---

## Instructions pour Claude (prochaine session)

Quand l'utilisateur (Christian Couillard) démarre une nouvelle session, tu
peux lire ce fichier pour comprendre où on en est et ce qui est prévu
ensuite. Les fichiers référencés (intake-form-v1.yaml, skills-prompts-v1.yaml,
CLAUDE_CODE_INSTRUCTIONS_SESSION_2A.md, CLAUDE_CODE_INSTRUCTIONS_SESSION_2B.md)
sont tous dans les project files et restent la source de vérité pour les
détails techniques.

Si Christian démarre par "on continue", il veut probablement dire "on
attaque la Session 2B-bis". Valide quand même avec lui avant de plonger
dans les instructions Claude Code.
