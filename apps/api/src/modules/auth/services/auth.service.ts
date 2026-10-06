import { JwtPayload, sign, verify } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoginMethod } from '@openathlete/database';
import {
  ApiEnvSchemaType,
  AuthResponseDto,
  FirebaseLoginDto,
  LoginDto,
} from '@openathlete/shared';

import { PrismaService } from 'src/modules/prisma/services/prisma.service';

import { AuthUser } from '../decorators/user.decorator';
import { FirebaseAuthService } from './firebase-auth.service';
import { UserService } from './user.service';

function deriveNames(params: { name?: string; email: string }): {
  firstName: string;
  lastName: string;
} {
  const safeName = (params.name || '').trim();
  if (safeName) {
    const parts = safeName.split(/\s+/g).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0]!, lastName: '' };
    }
    return {
      firstName: parts[0]!,
      lastName: parts.slice(1).join(' '),
    };
  }

  const emailLocalPart = params.email.split('@')[0] || 'Athlete';
  return { firstName: emailLocalPart, lastName: '' };
}

/** Client information recorded with each sign-in. */
export type LoginContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

// `lastSeenAt` is only written when older than this, so an active user costs
// at most one extra write every few minutes rather than one per request.
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
const USER_AGENT_MAX_LENGTH = 512;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private userService: UserService,
    private readonly configService: ConfigService<ApiEnvSchemaType, true>,
    private readonly firebaseAuthService: FirebaseAuthService,
  ) {}

  private createToken(
    userId: number,
    email: string,
    isRefresh: boolean,
    impersonatedBy?: number,
  ): string {
    return sign(
      impersonatedBy
        ? { userId: userId, email, impersonatedBy }
        : { userId: userId, email },
      this.configService.getOrThrow('JWT_SECRET_KEY'),
      {
        // Impersonation sessions are short-lived: they can't be extended
        // past 8h even with refreshes.
        expiresIn: isRefresh ? (impersonatedBy ? '8h' : '30d') : '1h',
      },
    );
  }

  /**
   * Issues tokens letting an admin browse the app as `targetUserId`.
   * The resulting session is read-only (enforced in JwtStrategy).
   */
  async impersonate(
    adminId: number,
    targetUserId: number,
  ): Promise<AuthResponseDto> {
    const admin = await this.prisma.user.findUnique({
      where: { userId: adminId },
      select: { isAdmin: true, email: true },
    });
    if (!admin?.isAdmin) throw new ForbiddenException();
    if (adminId === targetUserId) {
      throw new BadRequestException('Cannot impersonate yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { userId: targetUserId },
      select: { userId: true, email: true },
    });
    if (!target) throw new NotFoundException();

    this.logger.warn(
      `Admin ${adminId} (${admin.email}) started impersonating user ${target.userId} (${target.email})`,
    );

    return {
      accessToken: this.createToken(
        target.userId,
        target.email,
        false,
        adminId,
      ),
      refreshToken: this.createToken(
        target.userId,
        target.email,
        true,
        adminId,
      ),
    };
  }

  private async recordLogin(
    userId: number,
    method: LoginMethod,
    context: LoginContext = {},
  ): Promise<void> {
    const now = new Date();
    try {
      await this.prisma.$transaction([
        this.prisma.loginEvent.create({
          data: {
            userId,
            method,
            ipAddress: context.ipAddress || null,
            userAgent:
              context.userAgent?.slice(0, USER_AGENT_MAX_LENGTH) || null,
            createdAt: now,
          },
        }),
        this.prisma.user.update({
          where: { userId },
          data: { lastLoginAt: now, lastSeenAt: now },
        }),
      ]);
    } catch (error) {
      // Tracking must never prevent a user from signing in.
      this.logger.error(`Failed to record login of user ${userId}`, error);
    }
  }

  private async touchLastSeen(userId: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { userId },
        data: { lastSeenAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to update lastSeenAt of user ${userId}`, error);
    }
  }

  async login(
    credentials: LoginDto,
    context?: LoginContext,
  ): Promise<AuthResponseDto> {
    const { email, password } = credentials;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
      select: {
        userId: true,
        password: true,
        email: true,
      },
    });
    if (!user?.password) throw new UnauthorizedException();

    await this.userService.comparePasswords(
      {
        pass_hash: user.password,
        pass_string: password,
      },
      { email },
    );

    await this.recordLogin(user.userId, LoginMethod.PASSWORD, context);

    return {
      accessToken: this.createToken(user.userId, user.email, false),
      refreshToken: this.createToken(user.userId, user.email, true),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const payload = verify(
      refreshToken,
      this.configService.getOrThrow('JWT_SECRET_KEY'),
    ) as JwtPayload & Partial<{ userId: number; impersonatedBy: number }>;
    if (!payload.userId) throw new UnauthorizedException();
    const { impersonatedBy } = payload;
    const user = await this.prisma.user.findFirst({
      where: {
        userId: payload.userId,
      },
      select: {
        userId: true,
        email: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    if (impersonatedBy) {
      // Keep the impersonation going only while the admin is still an admin.
      const admin = await this.prisma.user.findUnique({
        where: { userId: impersonatedBy },
        select: { isAdmin: true },
      });
      if (!admin?.isAdmin) throw new UnauthorizedException();
      // Don't extend the session: reuse the original refresh token's expiry.
      return {
        accessToken: this.createToken(
          user.userId,
          user.email,
          false,
          impersonatedBy,
        ),
        refreshToken,
      };
    }

    await this.touchLastSeen(user.userId);

    return {
      accessToken: this.createToken(user.userId, user.email, false),
      refreshToken: this.createToken(user.userId, user.email, true),
    };
  }

  async loginWithFirebase(
    body: FirebaseLoginDto,
    context?: LoginContext,
  ): Promise<AuthResponseDto> {
    const verified = await this.firebaseAuthService.verifyIdToken(body.idToken);
    const email = verified.email.toLowerCase();

    let user = await this.prisma.user.findFirst({
      where: { email },
      select: { userId: true, email: true },
    });

    if (!user) {
      const { firstName, lastName } = deriveNames({
        name: verified.name,
        email,
      });

      // Create a strong random password (OAuth users won't use it directly).
      const randomPassword = randomUUID();
      const created = await this.userService.createAccount({
        email,
        password: randomPassword,
        firstName,
        lastName,
        // Already authenticated via a verified Firebase ID token — that's
        // this path's trust boundary, not the public signup access code.
        accessCode: this.configService.get('SIGNUP_ACCESS_CODE'),
        invitationToken: body.invitationToken,
        coachInvitationToken: body.coachInvitationToken,
      });

      user = { userId: created.userId, email };
    }

    await this.recordLogin(user.userId, LoginMethod.FIREBASE, context);

    return {
      accessToken: this.createToken(user.userId, user.email, false),
      refreshToken: this.createToken(user.userId, user.email, true),
    };
  }

  async validateUser(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.userId) {
      throw new UnauthorizedException();
    }
    if (!payload.email) {
      throw new UnauthorizedException();
    }
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: payload.email,
        },
        select: {
          userId: true,
          email: true,
          isAdmin: true,
          lastSeenAt: true,
          athlete: {
            select: {
              athleteId: true,
            },
          },
          coachAthletes: {
            select: {
              athleteId: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User not found for email ${payload.email}`);
      }

      if (user.userId !== payload.userId) {
        throw new Error(`Invalid id for email ${user.email}`);
      }

      const impersonatedBy =
        typeof payload.impersonatedBy === 'number'
          ? payload.impersonatedBy
          : null;
      const { lastSeenAt, ...authUser } = user;
      if (
        impersonatedBy === null &&
        (!lastSeenAt ||
          Date.now() - lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS)
      ) {
        // Fire and forget: don't delay the request on this write.
        void this.touchLastSeen(user.userId);
      }

      return {
        ...authUser,
        userId: user.userId,
        athlete: user.athlete ? { athleteId: user.athlete.athleteId } : null,
        coachAthletes:
          user.coachAthletes?.map((ca) => ({ athleteId: ca.athleteId })) || [],
        impersonatedBy,
      };
    } catch (error) {
      this.logger.error('Error in validateUser', error);
      throw error;
    }
  }
}
