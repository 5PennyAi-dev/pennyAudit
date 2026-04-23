import { useIntakeFormStore } from '../../stores/intakeFormStore';
import { Screen1Welcome } from './Screen1Welcome';
import { Screen2Business } from './Screen2Business';
import { Screen3Operations } from './Screen3Operations';
import { Screen4Challenges } from './Screen4Challenges';
import { Screen5TechStack } from './Screen5TechStack';
import { Screen6Resources } from './Screen6Resources';
import { Screen7Confirmation } from './Screen7Confirmation';

export function IntakeForm() {
  const currentScreen = useIntakeFormStore((s) => s.currentScreen);

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
