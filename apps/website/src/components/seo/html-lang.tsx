'use client';

import { useEffect } from 'react';

interface HtmlLangProps {
  locale: string;
}

/**
 * Component to set the HTML lang attribute dynamically based on locale
 * This ensures proper SEO and accessibility
 */
export function HtmlLang({ locale }: HtmlLangProps) {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'fr';
    }
  }, [locale]);

  return null;
}
