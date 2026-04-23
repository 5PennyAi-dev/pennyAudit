// Validation par écran du formulaire d'intake.
// Source de vérité : docs/specs/intake-form-v1.yaml

import { isValidEmail } from '../components/form-fields/EmailInput';
import { isValidUrl } from '../components/form-fields/UrlInput';
import type {
  FormErrors,
  IntakeFormData,
  IntakeFieldId,
  ScreenId,
} from '../types/intake';

const REQUIRED_MSG = 'Ce champ est requis.';
const EMAIL_INVALID_MSG = 'Entrez une adresse courriel valide.';
const URL_INVALID_MSG = 'Entrez une URL valide (ex. https://exemple.com).';

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function checkRequired(
  data: IntakeFormData,
  field: IntakeFieldId,
  errors: FormErrors,
) {
  if (isEmpty(data[field])) {
    errors[field] = REQUIRED_MSG;
  }
}

function checkMinLength(
  data: IntakeFormData,
  field: IntakeFieldId,
  min: number,
  errors: FormErrors,
) {
  if (errors[field]) return;
  const v = data[field];
  if (typeof v === 'string' && v.trim().length < min) {
    errors[field] = `Minimum ${min} caractères (actuel : ${v.trim().length}).`;
  }
}

export function validateScreen(
  screen: ScreenId,
  data: IntakeFormData,
): FormErrors {
  const errors: FormErrors = {};

  switch (screen) {
    case 1: {
      checkRequired(data, 'first_name', errors);
      if (isEmpty(data.email)) {
        errors.email = REQUIRED_MSG;
      } else if (!isValidEmail(data.email!)) {
        errors.email = EMAIL_INVALID_MSG;
      }
      break;
    }

    case 2: {
      checkRequired(data, 'business_name', errors);
      checkRequired(data, 'industry', errors);
      if (data.industry === 'autre') {
        checkRequired(data, 'industry_other', errors);
      }
      checkRequired(data, 'company_size', errors);
      checkRequired(data, 'primary_location', errors);
      if (data.website_url && !isValidUrl(data.website_url)) {
        errors.website_url = URL_INVALID_MSG;
      }
      break;
    }

    case 3: {
      checkRequired(data, 'revenue_model', errors);
      checkRequired(data, 'client_type', errors);
      checkRequired(data, 'contact_channels', errors);
      checkRequired(data, 'client_volume', errors);
      break;
    }

    case 4: {
      checkRequired(data, 'time_consuming_tasks', errors);
      checkMinLength(data, 'time_consuming_tasks', 50, errors);
      checkRequired(data, 'lost_opportunities', errors);
      checkRequired(data, 'automation_wish', errors);
      checkMinLength(data, 'automation_wish', 30, errors);
      break;
    }

    case 5: {
      checkRequired(data, 'data_sensitivity', errors);
      checkRequired(data, 'tech_comfort', errors);
      break;
    }

    case 6: {
      checkRequired(data, 'budget_range', errors);
      checkRequired(data, 'implementation_horizon', errors);
      checkRequired(data, 'preferred_approach', errors);
      break;
    }

    case 7: {
      if (!data.terms_acceptance) {
        errors.terms_acceptance = 'Vous devez accepter les conditions pour continuer.';
      }
      break;
    }
  }

  return errors;
}

export function screenIsValid(
  screen: ScreenId,
  data: IntakeFormData,
): boolean {
  return Object.keys(validateScreen(screen, data)).length === 0;
}
