export const getLocaleName = (locale: string) => {
  const localeMap: Record<string, string> = {
    fr: 'Français',
  };
  return localeMap[locale] || locale;
};
