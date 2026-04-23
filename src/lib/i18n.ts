import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import frCommon from '../locales/fr/common.json';
import enCommon from '../locales/en/common.json';
import frLanding from '../locales/fr/landing.json';
import enLanding from '../locales/en/landing.json';

export const NAMESPACES = [
  'common',
  'landing',
  'intake',
  'report',
  'dashboard',
  'errors',
] as const;

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: NAMESPACES,
    defaultNS: 'common',
    resources: {
      fr: { common: frCommon, landing: frLanding },
      en: { common: enCommon, landing: enLanding },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'pennyaudit-lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language || 'fr';
}

export default i18n;
