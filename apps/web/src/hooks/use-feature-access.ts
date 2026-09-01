import { useAppConfigQuery } from '@/api/config';

import { FeatureName } from '@openathlete/shared';

/**
 * Every feature is unlocked on this private deployment — the only thing
 * that can hide an AI feature is the server having no AI provider key
 * configured at all (see the `/config` endpoint).
 */
export function useFeatureAccess(featureName: FeatureName) {
  const { data: appConfig, isLoading } = useAppConfigQuery();

  const hasAccess = (() => {
    switch (featureName) {
      case FeatureName.AI_GENERATION:
      case FeatureName.AI_RPE_QUESTIONS:
        return !!appConfig?.ai;
      default:
        return false;
    }
  })();

  return { hasAccess, isLoading };
}
