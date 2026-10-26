/** Swatches offered when creating a category (any hex color is accepted). */
export const CATEGORY_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#84cc16',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
];

/** Starter categories suggested to a coach with no category yet. */
export const SUGGESTED_CATEGORIES = [
  { key: 'feet', color: '#0ea5e9' },
  { key: 'legs', color: '#10b981' },
  { key: 'core', color: '#f59e0b' },
  { key: 'upper', color: '#8b5cf6' },
  { key: 'general', color: '#6366f1' },
] as const;
