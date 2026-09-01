/**
 * Get the file path for a training plan JSON based on sport, distance, variant, and locale
 * @param sport - Sport type: 'running', 'trail', or 'triathlon'
 * @param distance - Distance identifier (e.g., 'marathon', '50km', 'ironman')
 * @param variant - Variant identifier (e.g., '4h30', '2000d+', '12h')
 * @param locale - Locale code (e.g., 'fr'). Defaults to 'fr' if not provided
 * @returns File path relative to plans directory
 */
export function getPlanPath(
  sport: 'running' | 'trail' | 'triathlon',
  distance: string,
  variant: string,
  locale: string = 'fr',
): string {
  // Normalize distance and variant for filename
  const normalizedDistance = distance.toLowerCase().replace(/\s+/g, '-');
  const normalizedVariant = variant.toLowerCase().replace(/\s+/g, '');
  // If locale is empty, return path without locale extension (for backward compatibility)
  if (!locale) {
    return `${sport}/${normalizedDistance}-${normalizedVariant}.json`;
  }
  return `${sport}/${normalizedDistance}-${normalizedVariant}.${locale}.json`;
}

/**
 * Parse route parameters to get plan file path
 * @param sport - Sport from route
 * @param distance - Distance from route
 * @param variant - Variant from route (timeTarget or elevationRange)
 * @param locale - Locale code (e.g., 'fr'). Defaults to 'fr' if not provided
 * @returns File path relative to plans directory
 */
export function getPlanPathFromRoute(
  sport: string,
  distance: string,
  variant: string,
  locale: string = 'fr',
): string {
  // Validate sport
  if (!['running', 'trail', 'triathlon'].includes(sport.toLowerCase())) {
    throw new Error(`Invalid sport: ${sport}`);
  }

  return getPlanPath(
    sport.toLowerCase() as 'running' | 'trail' | 'triathlon',
    distance,
    variant,
    locale,
  );
}
