import { useEffect, useState } from 'react';
import { useIntakeFormStore } from '../../stores/intakeFormStore';
import { getIntakeStatus } from '../../lib/supabase/intake';
import { Screen1Welcome } from './Screen1Welcome';
import { Screen2Business } from './Screen2Business';
import { Screen3Operations } from './Screen3Operations';
import { Screen4Challenges } from './Screen4Challenges';
import { Screen5TechStack } from './Screen5TechStack';
import { Screen6Resources } from './Screen6Resources';
import { Screen7Confirmation } from './Screen7Confirmation';

export function IntakeForm() {
  const currentScreen = useIntakeFormStore((s) => s.currentScreen);
  const auditId = useIntakeFormStore((s) => s.auditId);
  const resetForm = useIntakeFormStore((s) => s.resetForm);

  // Garde-fou : si un auditId persiste en localStorage mais que l'audit
  // n'est plus 'draft' (soumis, en cours, livré, erreur…), on ne peut
  // plus le modifier — on repart d'un formulaire vierge. Couvre les
  // entrées sur /intake autres que via le bouton du Nav (lien direct,
  // refresh page après soumission, etc.).
  const [checking, setChecking] = useState<boolean>(!!auditId);

  useEffect(() => {
    if (!auditId) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    getIntakeStatus(auditId)
      .then(({ status }) => {
        if (cancelled) return;
        if (status !== 'draft') resetForm();
      })
      .catch(() => {
        // Audit introuvable (404) ou erreur réseau : on reset par sécurité.
        if (!cancelled) resetForm();
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
    // Volontairement [auditId] — si l'auditId change pendant la session
    // (loadFromResumeToken par ex.), on revérifie.
  }, [auditId, resetForm]);

  if (checking) return null;

  switch (currentScreen) {
    case 1:
      return <Screen1Welcome />;
    case 2:
      return <Screen2Business />;
    case 3:
      return <Screen3Operations />;
    case 4:
      return <Screen4Challenges />;
    case 5:
      return <Screen5TechStack />;
    case 6:
      return <Screen6Resources />;
    case 7:
      return <Screen7Confirmation />;
    default:
      return <Screen1Welcome />;
  }
}
