import { readFile } from 'fs/promises';
import { join } from 'path';

import { SEOPlanData, seoPlanDataSchema } from '@openathlete/shared';

import { getPlanPathFromRoute } from './utils/get-plan-path';

/**
 * Load a training plan JSON file
 * @param sport - Sport type from route
 * @param distance - Distance from route
 * @param variant - Variant from route
 * @param locale - Locale code (e.g., 'fr'). Defaults to 'fr' if not provided
 * @returns Parsed and validated plan data
 * @throws Error if file not found or invalid
 */
export async function loadPlan(
  sport: string,
  distance: string,
  variant: string,
  locale: string = 'fr',
): Promise<SEOPlanData> {
  const planPath = getPlanPathFromRoute(sport, distance, variant, locale);
  const fullPath = join(
    process.cwd(),
    'src/lib/training-plans/plans',
    planPath,
  );
  try {
    const fileContent = await readFile(fullPath, 'utf-8');
    const planData = JSON.parse(fileContent);

    // Validate plan data
    const validationResult = seoPlanDataSchema.safeParse(planData);
    if (!validationResult.success) {
      console.error('validationResult.error', validationResult.error);
      throw new Error(`Invalid plan data: ${validationResult.error.message}`);
    }

    return validationResult.data;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // Fall back to the legacy path without a locale extension, for
      // backward compatibility with older plan files.
      try {
        const legacyPath = getPlanPathFromRoute(sport, distance, variant, '');
        const legacyFullPath = join(
          process.cwd(),
          'src/lib/training-plans/plans',
          legacyPath,
        );
        const fileContent = await readFile(legacyFullPath, 'utf-8');
        const planData = JSON.parse(fileContent);
        const validationResult = seoPlanDataSchema.safeParse(planData);
        if (validationResult.success) {
          return validationResult.data;
        }
      } catch {
        // If the fallback also fails, throw the original error below.
      }
      throw new Error(`Plan not found: ${planPath}`);
    }
    throw error;
  }
}
