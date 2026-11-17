import { Test } from '@nestjs/testing';

import { ConnectorProvider, ProviderAccount } from '@openathlete/database';

import { UserDeletingEvent } from 'src/events';

import { PrismaService } from '../prisma/services/prisma.service';
import { ProviderRevocationService } from './provider-revocation.service';
import {
  GarminProviderService,
  PolarProviderService,
  StravaProviderService,
  SuuntoProviderService,
} from './providers';

// The real provider services pull ESM-only dependencies (Garmin FIT SDK)
jest.mock('./providers', () => ({
  StravaProviderService: class StravaProviderService {},
  GarminProviderService: class GarminProviderService {},
  SuuntoProviderService: class SuuntoProviderService {},
  PolarProviderService: class PolarProviderService {},
}));

const account = (
  provider: ConnectorProvider,
  extra: Partial<ProviderAccount> = {},
) =>
  ({
    providerAccountId: 1,
    athleteId: 10,
    provider,
    status: 'active',
    accessToken: 'stored-token',
    externalUserId: null,
    ...extra,
  }) as ProviderAccount;

describe('ProviderRevocationService', () => {
  let service: ProviderRevocationService;
  const prisma = { providerAccount: { findMany: jest.fn() } };
  const strava = {
    getValidAccessToken: jest.fn().mockResolvedValue('fresh-strava'),
    deauthorize: jest.fn().mockResolvedValue(undefined),
  };
  const garmin = {
    getValidAccessToken: jest.fn().mockResolvedValue('fresh-garmin'),
    deleteUserRegistration: jest.fn().mockResolvedValue(undefined),
  };
  const suunto = {
    getValidAccessToken: jest.fn().mockResolvedValue('fresh-suunto'),
    deauthorize: jest.fn().mockResolvedValue(undefined),
  };
  const polar = { deregisterUser: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProviderRevocationService,
        { provide: PrismaService, useValue: prisma },
        { provide: StravaProviderService, useValue: strava },
        { provide: GarminProviderService, useValue: garmin },
        { provide: SuuntoProviderService, useValue: suunto },
        { provide: PolarProviderService, useValue: polar },
      ],
    }).compile();
    service = moduleRef.get(ProviderRevocationService);
  });

  it('deauthorizes Strava with a refreshed token', async () => {
    const strAccount = account(ConnectorProvider.STRAVA);
    await expect(service.revokeAccount(strAccount)).resolves.toBe(true);
    expect(strava.getValidAccessToken).toHaveBeenCalledWith(strAccount);
    expect(strava.deauthorize).toHaveBeenCalledWith('fresh-strava');
  });

  it('calls the right endpoint for Garmin, Suunto and Polar', async () => {
    await service.revokeAccount(account(ConnectorProvider.GARMIN));
    await service.revokeAccount(account(ConnectorProvider.SUUNTO));
    await service.revokeAccount(
      account(ConnectorProvider.POLAR, { externalUserId: '42' }),
    );
    expect(garmin.deleteUserRegistration).toHaveBeenCalledWith('fresh-garmin');
    expect(suunto.deauthorize).toHaveBeenCalledWith('fresh-suunto');
    expect(polar.deregisterUser).toHaveBeenCalledWith('stored-token', '42');
  });

  it('never throws when the provider fails', async () => {
    strava.deauthorize.mockRejectedValueOnce(new Error('Strava is down'));
    await expect(
      service.revokeAccount(account(ConnectorProvider.STRAVA)),
    ).resolves.toBe(false);
  });

  it('skips providers without a revocation API', async () => {
    await expect(
      service.revokeAccount(account(ConnectorProvider.COROS)),
    ).resolves.toBe(false);
  });

  it('revokes every active account before a user is deleted', async () => {
    prisma.providerAccount.findMany.mockResolvedValue([
      account(ConnectorProvider.STRAVA),
      account(ConnectorProvider.GARMIN),
    ]);
    await service.onUserDeleting(
      new UserDeletingEvent({ userId: 3, athleteId: 10 }),
    );
    expect(prisma.providerAccount.findMany).toHaveBeenCalledWith({
      where: { athleteId: 10, status: 'active' },
    });
    expect(strava.deauthorize).toHaveBeenCalled();
    expect(garmin.deleteUserRegistration).toHaveBeenCalled();
  });

  it('does nothing for a user without athlete profile', async () => {
    await service.onUserDeleting(
      new UserDeletingEvent({ userId: 3, athleteId: null }),
    );
    expect(prisma.providerAccount.findMany).not.toHaveBeenCalled();
  });
});
