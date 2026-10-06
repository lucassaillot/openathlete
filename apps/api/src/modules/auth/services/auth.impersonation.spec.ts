import { verify } from 'jsonwebtoken';

import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import { AdminGuard } from 'src/modules/admin/admin.guard';
import { WsJwtAuthGuard } from 'src/modules/messages/guards/ws-jwt-auth.guard';
import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { AuthUser } from '../decorators/user.decorator';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { UserService } from './user.service';

const SECRET = 'test-secret';

function createService() {
  const prisma = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  };
  const config = { getOrThrow: () => SECRET, get: () => undefined };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as UserService,
    config as never,
    {} as FirebaseAuthService,
  );
  return { service, prisma };
}

describe('AuthService.impersonate', () => {
  it('issues tokens for the target user carrying the admin id', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique
      .mockResolvedValueOnce({ isAdmin: true, email: 'admin@test.com' })
      .mockResolvedValueOnce({ userId: 42, email: 'user@test.com' });

    const { accessToken, refreshToken } = await service.impersonate(1, 42);

    expect(verify(accessToken, SECRET)).toMatchObject({
      userId: 42,
      email: 'user@test.com',
      impersonatedBy: 1,
    });
    expect(verify(refreshToken, SECRET)).toMatchObject({
      userId: 42,
      impersonatedBy: 1,
    });
  });

  it('rejects non-admins', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValueOnce({ isAdmin: false });
    await expect(service.impersonate(1, 42)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects impersonating yourself', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValueOnce({ isAdmin: true });
    await expect(service.impersonate(1, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects unknown users', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique
      .mockResolvedValueOnce({ isAdmin: true })
      .mockResolvedValueOnce(null);
    await expect(service.impersonate(1, 42)).rejects.toThrow(NotFoundException);
  });

  it('keeps the impersonation (and its expiry) on refresh', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique
      .mockResolvedValueOnce({ isAdmin: true, email: 'admin@test.com' })
      .mockResolvedValueOnce({ userId: 42, email: 'user@test.com' });
    const tokens = await service.impersonate(1, 42);

    prisma.user.findFirst.mockResolvedValueOnce({
      userId: 42,
      email: 'user@test.com',
    });
    prisma.user.findUnique.mockResolvedValueOnce({ isAdmin: true });
    const refreshed = await service.refresh(tokens.refreshToken);

    expect(verify(refreshed.accessToken, SECRET)).toMatchObject({
      userId: 42,
      impersonatedBy: 1,
    });
    expect(refreshed.refreshToken).toBe(tokens.refreshToken);
  });

  it('stops the impersonation on refresh once the admin lost its rights', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique
      .mockResolvedValueOnce({ isAdmin: true, email: 'admin@test.com' })
      .mockResolvedValueOnce({ userId: 42, email: 'user@test.com' });
    const tokens = await service.impersonate(1, 42);

    prisma.user.findFirst.mockResolvedValueOnce({
      userId: 42,
      email: 'user@test.com',
    });
    prisma.user.findUnique.mockResolvedValueOnce({ isAdmin: false });
    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('JwtStrategy read-only impersonation', () => {
  const user: AuthUser = { userId: 42, email: 'u@t.fr', athlete: null };
  const authService = { validateUser: jest.fn().mockResolvedValue(user) };
  const strategy = new JwtStrategy(
    { getOrThrow: () => SECRET } as never,
    authService as unknown as AuthService,
  );
  const payload = { userId: 42, email: 'u@t.fr', type: 'access' };

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])(
    'blocks %s requests',
    async (method) => {
      await expect(
        strategy.validate({ method } as never, {
          ...payload,
          impersonatedBy: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    },
  );

  it('allows GET requests', async () => {
    await expect(
      strategy.validate({ method: 'GET' } as never, {
        ...payload,
        impersonatedBy: 1,
      }),
    ).resolves.toBe(user);
  });

  it('does not restrict normal sessions', async () => {
    await expect(
      strategy.validate({ method: 'POST' } as never, payload),
    ).resolves.toBe(user);
  });
});

describe('AdminGuard', () => {
  const contextFor = (user: Partial<AuthUser> | null) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;
  const guard = new AdminGuard();

  it('lets admins through', () => {
    expect(guard.canActivate(contextFor({ isAdmin: true }))).toBe(true);
  });

  it('blocks non-admins', () => {
    expect(guard.canActivate(contextFor({ isAdmin: false }))).toBe(false);
    expect(guard.canActivate(contextFor(null))).toBe(false);
  });

  it('blocks impersonation sessions, even of an admin', () => {
    expect(
      guard.canActivate(contextFor({ isAdmin: true, impersonatedBy: 7 })),
    ).toBe(false);
  });
});

describe('WsJwtAuthGuard read-only impersonation', () => {
  const contextFor = (pattern: string) =>
    ({
      switchToWs: () => ({
        getClient: () => ({
          handshake: { headers: { authorization: 'Bearer t' } },
          data: {},
        }),
        getPattern: () => pattern,
      }),
    }) as unknown as ExecutionContext;
  const guardFor = (payload: object) =>
    new WsJwtAuthGuard(
      { verifyAsync: jest.fn().mockResolvedValue(payload) } as never,
      {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ userId: 42, email: 'u@t.fr' }),
        },
      } as never,
    );

  it.each(['send_message', 'update_message', 'mark_as_read'])(
    'refuses %s',
    async (pattern) => {
      await expect(
        guardFor({
          userId: 42,
          email: 'u@t.fr',
          impersonatedBy: 1,
        }).canActivate(contextFor(pattern)),
      ).rejects.toThrow(WsException);
    },
  );

  it('allows joining a thread', async () => {
    await expect(
      guardFor({ userId: 42, email: 'u@t.fr', impersonatedBy: 1 }).canActivate(
        contextFor('join_thread'),
      ),
    ).resolves.toBe(true);
  });

  it('does not restrict normal sessions', async () => {
    await expect(
      guardFor({ userId: 42, email: 'u@t.fr' }).canActivate(
        contextFor('send_message'),
      ),
    ).resolves.toBe(true);
  });
});
