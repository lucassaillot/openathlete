'use client';

import { setLocale } from '@/paraglide/runtime.js';

interface ParaglideProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export function ParaglideProvider({ children }: ParaglideProviderProps) {
  // French is the only supported locale.
  if (typeof window !== 'undefined') {
    setLocale('fr', { reload: false });
  }

  return <>{children}</>;
}
