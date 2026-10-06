import { sign } from 'jsonwebtoken';

import { LoginMethod } from '@openathlete/database';

import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { AuthService } from './auth.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { UserService } from './user.service';

const SECRET = 'test-secret';

function createService() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    loginEvent: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const userService = { comparePasswords: jest.fn().mockResolvedValue(true) };
  const firebase = {
    verifyIdToken: jest.fn().mockResolvedValue({ email: 'U@T.fr' }),
  };
  const config = { getOrThrow: () => SECRET, get: () => undefined };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    userService as unknown as UserService,
    config as never,
    firebase as unknown as FirebaseAuthService,
  );
  return { service, prisma };
}

const dbUser = (lastSeenAt: Date | null) => ({
  userId: 42,
  email: 'u@t.fr',
  isAdmin: false,
  lastSeenAt,
  athlete: null,
  coachAthletes: [],
});

const payload = { userId: 42, email: 'u@t.fr', type: 'access' };

describe('AuthService login tracking', () => {
  it('records password logins with the client info', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValueOnce({
      userId: 42,
      email: 'u@t.fr',
      password: 'hash',
    });

    await service.login(
      { email: 'u@t.fr', password: 'pw' },
      { ipAddress: '1.2.3.4', userAgent: 'Mozilla/5.0' },
    );

    expect(prisma.loginEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 42,
        method: LoginMethod.PASSWORD,
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
      }),
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 42 },
      data: {
        lastLoginAt: expect.any(Date),
        lastSeenAt: expect.any(Date),
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('records Firebase logins', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValueOnce({
      userId: 42,
      email: 'u@t.fr',
    });

    await service.loginWithFirebase({ idToken: 't' } as never);

    expect(prisma.loginEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 42,
        method: LoginMethod.FIREBASE,
      }),
    });
  });

  it('still signs the user in when tracking fails', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValueOnce({
      userId: 42,
      email: 'u@t.fr',
      password: 'hash',
    });
    prisma.$transaction.mockRejectedValueOnce(new Error('db down'));

    await expect(
      service.login({ email: 'u@t.fr', password: 'pw' }),
    ).resolves.toHaveProperty('accessToken');
  });

  it('updates lastSeenAt on refresh', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValueOnce({
      userId: 42,
      email: 'u@t.fr',
    });

    await service.refresh(sign({ userId: 42, email: 'u@t.fr' }, SECRET));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 42 },
      data: { lastSeenAt: expect.any(Date) },
    });
  });

  it('updates a stale lastSeenAt on authenticated requests', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValueOnce(
      dbUser(new Date(Date.now() - 60 * 60 * 1000)),
    );

    const user = await service.validateUser(payload);

    expect(user).not.toHaveProperty('lastSeenAt');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { userId: 42 },
      data: { lastSeenAt: expect.any(Date) },
    });
  });

  it('skips the write when lastSeenAt is recent', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValueOnce(dbUser(new Date()));

    await service.validateUser(payload);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not count impersonation sessions as user activity', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValueOnce(dbUser(null));

    await service.validateUser({ ...payload, impersonatedBy: 1 });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
