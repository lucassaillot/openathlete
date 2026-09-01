import { ConfigService } from '@nestjs/config';

import type { ApiEnvSchemaType } from '@openathlete/shared';

/** Whether an AI provider key is configured on this server at all. */
export function isAIConfigured(
  configService: ConfigService<ApiEnvSchemaType, true>,
): boolean {
  return (
    !!configService.get('OPENAI_API_KEY') ||
    !!configService.get('GOOGLE_GENERATIVE_AI_API_KEY')
  );
}
