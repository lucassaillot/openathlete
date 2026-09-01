import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiEnvSchemaType } from '@openathlete/shared';

import { isAIConfigured } from 'src/common/utils/ai-config.util';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly configService: ConfigService<ApiEnvSchemaType, true>,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Public runtime configuration',
    description:
      'Returns which optional integrations (connectors, AI features) are configured on this server, so the frontend can hide UI for features that have no credentials set. Contains no secrets — booleans only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Runtime capability flags',
  })
  getConfig() {
    return {
      connectors: {
        strava:
          !!this.configService.get('STRAVA_CLIENT_ID') &&
          !!this.configService.get('STRAVA_CLIENT_SECRET'),
        garmin:
          !!this.configService.get('GARMIN_CLIENT_ID') &&
          !!this.configService.get('GARMIN_CLIENT_SECRET'),
        suunto:
          !!this.configService.get('SUUNTO_CLIENT_ID') &&
          !!this.configService.get('SUUNTO_CLIENT_SECRET'),
        coros: false,
        polar:
          !!this.configService.get('POLAR_CLIENT_ID') &&
          !!this.configService.get('POLAR_CLIENT_SECRET'),
      },
      ai: isAIConfigured(this.configService),
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Returns the health status of the API server. This endpoint is typically used by monitoring systems, load balancers, and orchestration platforms (like Kubernetes) to verify that the service is running and responsive. Returns a simple status object indicating the API is operational.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy and operational',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
          description: 'Health status indicator',
        },
      },
      required: ['status'],
    },
  })
  health() {
    return { status: 'ok' };
  }
}
