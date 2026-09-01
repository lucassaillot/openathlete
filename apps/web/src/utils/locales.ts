import type { Locale } from 'date-fns';
import { fr } from 'date-fns/locale';

export const SUPPORTED_LOCALES = ['fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const getLocaleName = (locale: string) => {
  const localeMap: Record<string, string> = {
    fr: 'Français',
  };
  return localeMap[locale] || locale;
};

export const getDateLocale = (locale: string) => {
  const localeMap: Record<string, string> = {
    fr: 'fr-FR',
  };
  return localeMap[locale] || locale;
};

export const getDateFnsLocale = (locale: string) => {
  const localeMap: Record<string, Locale> = {
    fr,
  };
  return localeMap[locale] || fr;
};
