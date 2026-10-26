import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ConnectorProvider, ProviderAccount } from '@openathlete/database';

import { UserDeletingEvent } from 'src/events';

import { PrismaService } from '../prisma/services/prisma.service';
import {
  GarminProviderService,
  PolarProviderService,
  StravaProviderService,
  SuuntoProviderService,
} from './providers';

/**
 * Revokes the application's access on the provider side (Strava, Garmin,
 * Suunto, Polar). Failures are logged and never thrown: a provider being
 * down must not prevent a disconnection or an account deletion.
 */
@Injectable()
export class ProviderRevocationService {
  private readonly logger = new Logger(ProviderRevocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stravaProviderService: StravaProviderService,
    private readonly garminProviderService: GarminProviderService,
    private readonly suuntoProviderService: SuuntoProviderService,
    private readonly polarProviderService: PolarProviderService,
  ) {}

  /** Returns true when the provider confirmed the revocation. */
  async revokeAccount(account: ProviderAccount): Promise<boolean> {
    try {
      switch (account.provider) {
        case ConnectorProvider.STRAVA: {
          const token =
            await this.stravaProviderService.getValidAccessToken(account);
          await this.stravaProviderService.deauthorize(token);
          return true;
        }
        case ConnectorProvider.GARMIN: {
          const token =
            await this.garminProviderService.getValidAccessToken(account);
          await this.garminProviderService.deleteUserRegistration(token);
          return true;
        }
        case ConnectorProvider.SUUNTO: {
          const token =
            await this.suuntoProviderService.getValidAccessToken(account);
          await this.suuntoProviderService.deauthorize(token);
          return true;
        }
        case ConnectorProvider.POLAR: {
          if (!account.externalUserId) return false;
          await this.polarProviderService.deregisterUser(
            account.accessToken,
            account.externalUserId,
          );
          return true;
        }
        default:
          // No revocation endpoint for this provider (e.g. Coros)
          this.logger.log(
            `No provider-side revocation for ${account.provider} account ${account.providerAccountId}`,
          );
          return false;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to revoke ${account.provider} account ${account.providerAccountId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /** Revokes every active provider account of an athlete. */
  async revokeAllForAthlete(athleteId: number): Promise<void> {
    const accounts = await this.prisma.providerAccount.findMany({
      where: { athleteId, status: 'active' },
    });
    await Promise.all(accounts.map((account) => this.revokeAccount(account)));
  }

  @OnEvent(UserDeletingEvent.SLUG, { promisify: true })
  async onUserDeleting(event: UserDeletingEvent): Promise<void> {
    if (!event.payload.athleteId) return;
    try {
      await this.revokeAllForAthlete(event.payload.athleteId);
    } catch (error) {
      this.logger.warn(
        `Provider revocation before deleting user ${event.payload.userId} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
