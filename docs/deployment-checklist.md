# Check-list de déploiement — pennyAudit

À parcourir **avant le premier déploiement production** sur Vercel, puis
à relire à chaque fois qu'un service externe est ajouté ou rotaté.

---

## 1. Supabase

- [ ] Projet Supabase de production créé (distinct du dev si possible).
- [ ] Extensions actives : `uuid-ossp`, `vector`.
- [ ] Schéma appliqué : exécuter `sql/schema.sql` dans le SQL Editor.
- [ ] Migrations versionnées appliquées dans l'ordre chronologique
      depuis `sql/migrations/` (au minimum :
      `2026-04-23_add_resume_email_sent_at.sql`).
- [ ] Patterns seedés : `npm run seed:patterns` avec les credentials prod.
- [ ] RLS policies vérifiées — pour le MVP, les writes passent par la
      service role côté serveur ; confirmer que les tables sensibles ne
      sont pas exposées via la clé anon.
- [ ] Récupérer `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` depuis
      Settings → API.

## 2. Variables d'environnement Vercel

Dans **Vercel → Project → Settings → Environment Variables** (scope
« Production » au minimum) :

### Client (exposées dans le bundle)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_STRIPE_PUBLIC_KEY` (quand Stripe sera branché)

### Serveur (jamais dans le bundle)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `VOYAGE_API_KEY`
- [ ] `RESUME_TOKEN_SECRET` — générer une chaîne aléatoire longue,
      ex. `openssl rand -base64 48`. Ne **jamais** réutiliser une clé
      existante.
- [ ] `CRON_SECRET` — idem, chaîne aléatoire longue dédiée au cron.
      Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`
      aux endpoints `/api/cron/*` quand cette variable est définie.
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM` — ex. `5PennyAi <no-reply@5pennyai.com>`, doit
      utiliser un domaine vérifié chez Resend (voir section 3).
- [ ] `PUBLIC_BASE_URL` — ex. `https://5pennyai.com`. Utilisée pour
      construire les liens de reprise dans les courriels.
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (quand Stripe sera
      branché).

## 3. Resend (envoi de courriels)

- [ ] Compte Resend créé et plan choisi.
- [ ] Domaine expéditeur ajouté (ex. `5pennyai.com`).
- [ ] DNS configurés : enregistrements SPF, DKIM et DMARC affichés dans
      Resend → Domains. **Attendre que Resend affiche « Verified »**
      avant d'envoyer en prod — sinon les courriels partiront en spam.
- [ ] Adresse `RESEND_FROM` alignée sur le domaine vérifié.
- [ ] Envoyer un courriel de test depuis l'UI Resend vers une boîte
      Gmail et une boîte Outlook — vérifier qu'il arrive en boîte de
      réception (pas en spam/promotions).

## 4. Cron Vercel

- [ ] `vercel.json` inclus dans le repo et commité.
- [ ] Après le premier déploiement prod, vérifier dans **Vercel →
      Project → Settings → Cron Jobs** que le job
      `/api/cron/send-resume-emails` apparaît bien avec la schedule
      `*/15 * * * *`.
- [ ] Tester manuellement depuis l'UI Vercel (« Run » sur le cron job)
      et vérifier que la réponse est `200 OK` avec un `summary`.
- [ ] Vérifier dans les logs Vercel qu'aucun `401 Unauthorized` ne sort
      (indiquerait que `CRON_SECRET` côté endpoint ≠ celui injecté par
      Vercel).

## 5. Tests fumée post-déploiement

Sur l'URL de prod (`PUBLIC_BASE_URL`) :

- [ ] Charger `/` — la landing s'affiche sans erreur console.
- [ ] Aller sur `/intake`, remplir l'écran 1 avec un vrai courriel
      (de test), passer à l'écran 2.
- [ ] Vérifier dans Supabase qu'une ligne `audits` avec `status='draft'`
      existe et que `intake_data` contient le `email` et
      `_currentScreen=2`.
- [ ] Attendre 30 min + le prochain tick du cron (≤ 15 min), puis
      vérifier que le courriel de reprise est arrivé et que
      `resume_email_sent_at` est peuplé.
- [ ] Cliquer le lien du courriel — doit ramener à l'écran 2 avec les
      données intactes.

## 6. Sécurité / hygiène

- [ ] `.env` local **non commité** (vérifier `.gitignore`).
- [ ] Aucun secret dans le bundle client (grep
      `grep -r "SERVICE_ROLE\|ANTHROPIC_API\|RESEND_API\|CRON_SECRET" dist/`
      ne doit rien retourner).
- [ ] Rotation prévue : noter quelque part (1Password, Bitwarden) la
      date de création de `RESUME_TOKEN_SECRET` et `CRON_SECRET` — à
      rotater si compromission suspectée.

---

*Dernière mise à jour : 2026-04-23 (fin Session 2A).*
