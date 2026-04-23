import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  Input,
  LanguageSwitcher,
  ProgressBar,
  StepIndicator,
} from '../components/ui';

export function ComponentsDemo() {
  return (
    <div className="min-h-screen bg-paper font-sans text-navy-600">
      <HeroHeader />

      <main className="mx-auto max-w-6xl space-y-28 px-8 py-24 md:px-12">
        <Section
          index="01"
          title="Button"
          tagline="Trois variants, deux tailles. Le primary est l'orange 5PennyAi ; les ghosts sont neutres."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Card variant="default" className="space-y-6">
              <TokenRow label="primary · md · lg" />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Lancer l'audit</Button>
                <Button variant="primary" size="lg">
                  Lancer l'audit
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
            </Card>

            <Card variant="cream" className="space-y-6">
              <TokenRow label="ghost · md · lg" />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost">Voir un exemple</Button>
                <Button variant="ghost" size="lg">
                  Voir un exemple
                </Button>
                <Button variant="ghost" disabled>
                  Disabled
                </Button>
              </div>
            </Card>

            <div className="relative overflow-hidden rounded-2xl bg-navy-600 p-9 shadow-(--shadow-card) md:col-span-2">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-20 size-[320px] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgb(245 125 32 / 0.08) 0%, transparent 70%)',
                }}
              />
              <div className="relative space-y-6">
                <TokenRow label="ghost-dark · sur navy-600" tone="dark" />
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="ghost-dark">Voir un exemple</Button>
                  <Button variant="ghost-dark" size="lg">
                    Voir un exemple
                  </Button>
                  <Button variant="primary" size="lg">
                    Commencer mon audit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          index="02"
          title="Card"
          tagline="Default, cream, featured. Toutes les trois font un lift de 4 px au hover avec une ombre douce."
        >
          <div className="grid gap-6 md:grid-cols-3">
            <Card variant="default" className="flex flex-col gap-4">
              <TokenRow label="default" />
              <h3 className="text-xl font-bold tracking-[-0.01em]">
                Voie A — Audit seul
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Vous recevez le rapport et vous configurez les outils
                vous-même.
              </p>
              <div className="mt-auto font-mono text-xs text-muted">149 $</div>
            </Card>

            <Card variant="featured" className="flex flex-col gap-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-500">
                featured · le plus choisi
              </span>
              <h3 className="text-xl font-bold tracking-[-0.01em] text-white">
                Voie B — Accompagnement
              </h3>
              <p className="text-sm leading-relaxed text-white/70">
                On configure pour vous les outils recommandés et on forme
                votre équipe.
              </p>
              <div className="mt-auto font-mono text-xs text-white/60">
                dès 1 800 $
              </div>
            </Card>

            <Card variant="cream" className="flex flex-col gap-4">
              <TokenRow label="cream" />
              <h3 className="text-xl font-bold tracking-[-0.01em]">
                Voie C — Custom
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Quand les outils du marché ne suffisent pas pour vos
                besoins spécifiques.
              </p>
              <div className="mt-auto font-mono text-xs text-muted">
                dès 8 000 $
              </div>
            </Card>
          </div>
        </Section>

        <Section
          index="03"
          title="Badge"
          tagline="Eyebrow pour introduire, tags pour qualifier, status pour signaler un état système."
        >
          <Card variant="default" className="flex flex-wrap items-center gap-4">
            <Badge variant="eyebrow" withDot>
              Audit IA · Conçu au Québec
            </Badge>
            <Badge variant="eyebrow">Sans point</Badge>
            <Badge variant="tag-primary">Quick win</Badge>
            <Badge variant="tag-secondary">À court terme</Badge>
            <Badge variant="status" withDot>
              Traitement terminé
            </Badge>
          </Card>
        </Section>

        <Section
          index="04"
          title="Input"
          tagline="Hauteur 44 px, bordure 1,5 px. Au focus, la bordure passe orange avec un ring subtil. État d'erreur en danger."
        >
          <Card variant="default" className="grid max-w-3xl gap-6 md:grid-cols-2">
            <Input
              label="Adresse courriel"
              type="email"
              placeholder="christian@entreprise.ca"
              helperText="On ne partage jamais votre adresse."
            />

            <Input
              label="Nom d'entreprise"
              type="text"
              placeholder="Atelier Beaulieu"
            />

            <Input
              label="Téléphone"
              type="tel"
              defaultValue="514-555-"
              error="Numéro incomplet — format attendu 514-555-1234."
            />

            <Input
              label="Identifiant"
              type="text"
              defaultValue="pennyaudit-01"
              disabled
              helperText="Généré automatiquement, non modifiable."
            />
          </Card>
        </Section>

        <Section
          index="05"
          title="ProgressBar"
          tagline="Hauteur 6 px, gradient orange 500 → 600. En mode animé, ondule entre 40 % et 65 % pour les états indéterminés."
        >
          <Card variant="default" className="space-y-8">
            <div className="space-y-3">
              <TokenRow label="value = 33" />
              <ProgressBar value={33} showLabel />
            </div>
            <div className="space-y-3">
              <TokenRow label="value = 72" />
              <ProgressBar value={72} showLabel />
            </div>
            <div className="space-y-3">
              <TokenRow label="animated · indéterminé" />
              <ProgressBar animated label="Traitement…" showLabel />
            </div>
          </Card>
        </Section>

        <Section
          index="06"
          title="StepIndicator"
          tagline="Trois états pour marquer la progression dans un pipeline. Cercle de 26 px, coche SVG pour l'état done."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Card variant="default" className="space-y-6">
              <TokenRow label="états isolés" />
              <div className="flex items-center gap-6">
                <StepIndicator state="pending" number={1} />
                <StepIndicator state="active" number={2} />
                <StepIndicator state="done" number={3} />
              </div>
            </Card>

            <Card variant="default" className="space-y-4">
              <TokenRow label="en contexte — pipeline audit" />
              <ul className="space-y-4">
                <StepRow state="done" n={1} label="Analyse du profil d'entreprise" meta="42 s" />
                <StepRow state="done" n={2} label="Identification des opportunités" meta="1 m 14 s" />
                <StepRow state="active" n={3} label="Évaluation des risques" meta="En cours…" />
                <StepRow state="pending" n={4} label="Audit technologique" meta="—" />
                <StepRow state="pending" n={5} label="Synthèse et feuille de route" meta="—" />
              </ul>
              <div className="pt-2">
                <ProgressBar value={48} showLabel label="3 / 5" />
              </div>
            </Card>
          </div>
        </Section>

        <Section
          index="07"
          title="LanguageSwitcher"
          tagline="Pill mono-font, deux variants. Dark pour les nav navy, light pour les fonds clairs."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl bg-navy-600 p-9">
              <TokenRow label="dark · sur navy-600" tone="dark" />
              <div className="mt-6">
                <LanguageSwitcher variant="dark" />
              </div>
            </div>
            <Card variant="cream" className="space-y-6">
              <TokenRow label="light · sur cream" />
              <LanguageSwitcher variant="light" />
            </Card>
          </div>
        </Section>
      </main>

      <footer className="border-t border-line bg-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-8 font-mono text-xs tracking-[0.08em] text-muted md:px-12">
          <span>pennyaudit · components v0.1</span>
          <span>design system · docs/DESIGN_SYSTEM.md</span>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────── Sous-composants de la page ─────────────────── */

function HeroHeader() {
  return (
    <section className="relative overflow-hidden bg-navy-600 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgb(245 125 32 / 0.08) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgb(245 125 32 / 0.4), transparent)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-8 pt-20 pb-24 md:px-12">
        <div className="mb-8 flex items-start justify-between gap-6">
          <Badge variant="eyebrow" withDot>
            Components · v0.1
          </Badge>
          <LanguageSwitcher variant="dark" />
        </div>

        <h1 className="max-w-3xl text-[clamp(38px,4.6vw,60px)] font-bold leading-[1.05] tracking-[-0.03em]">
          Les sept primitives qui{' '}
          <span className="text-orange-500">bâtissent l'audit</span>.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
          Button, Card, Badge, Input, ProgressBar, StepIndicator,
          LanguageSwitcher — les blocs communs à chaque écran. Chaque
          variant respecte les tokens navy et orange du design system.
        </p>

        <nav
          aria-label="Table des matières"
          className="mt-10 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.1em] text-white/50"
        >
          <span>§ 01 Button</span>
          <span>§ 02 Card</span>
          <span>§ 03 Badge</span>
          <span>§ 04 Input</span>
          <span>§ 05 ProgressBar</span>
          <span>§ 06 StepIndicator</span>
          <span>§ 07 LanguageSwitcher</span>
        </nav>
      </div>
    </section>
  );
}

function Section({
  index,
  title,
  tagline,
  children,
}: {
  index: string;
  title: string;
  tagline: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-10">
      <header className="flex flex-col gap-4 border-t border-line pt-8">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-orange-500">
            § {index}
          </span>
          <h2 className="text-3xl font-bold tracking-[-0.02em]">{title}</h2>
        </div>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
          {tagline}
        </p>
      </header>
      {children}
    </section>
  );
}

function TokenRow({
  label,
  tone = 'light',
}: {
  label: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <span
      className={
        tone === 'dark'
          ? 'font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60'
          : 'font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted'
      }
    >
      {label}
    </span>
  );
}

function StepRow({
  state,
  n,
  label,
  meta,
}: {
  state: 'pending' | 'active' | 'done';
  n: number;
  label: string;
  meta: string;
}) {
  return (
    <li className="flex items-center gap-4">
      <StepIndicator state={state} number={n} />
      <span
        className={
          state === 'pending'
            ? 'flex-1 text-sm text-muted'
            : 'flex-1 text-sm font-medium text-navy-600'
        }
      >
        {label}
      </span>
      <span className="font-mono text-[11px] text-muted">{meta}</span>
    </li>
  );
}
