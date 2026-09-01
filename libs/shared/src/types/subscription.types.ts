/**
 * Feature names — private deployment, every feature is unlocked for every
 * user; this only distinguishes which server-side capability (AI) a UI
 * surface depends on so it can hide itself when that capability isn't
 * configured (see the `/config` endpoint and `useFeatureAccess`).
 */
export enum FeatureName {
  AI_GENERATION = 'ai-generation',
  AI_RPE_QUESTIONS = 'ai-rpe-questions',
}
