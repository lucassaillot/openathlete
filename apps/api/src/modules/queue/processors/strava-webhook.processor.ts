import { Job } from 'bullmq';

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';

import { StravaProviderService } from '../../providers-sync/providers';
import { StravaWebhookJobData } from '../queue.service';

@Processor('strava-webhook', { concurrency: 3 })
export class StravaWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(StravaWebhookProcessor.name);

  constructor(
    @Inject(forwardRef(() => StravaProviderService))
    private readonly stravaProviderService: StravaProviderService,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<StravaWebhookJobData>, error: Error) {
    this.logger.error(`Strava webhook job ${job.id} failed: ${error.message}`);
  }

  async process(job: Job<StravaWebhookJobData>) {
    await this.stravaProviderService.handleWebhook(job.data.payload);
  }
}
