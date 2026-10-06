import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@openathlete/database';

import { PrismaService } from '../prisma/services/prisma.service';

const USERS_PAGE_SIZE = 20;
const LOGIN_EVENTS_LIMIT = 50;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
// A user counts as "online" when seen within this window (lastSeenAt is
// throttled to a 5 min resolution).
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export type AdminUsersSort = 'createdAt' | 'lastSeenAt' | 'lastLoginAt';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = Date.now();
    const seenSince = (ms: number) => ({
      where: { lastSeenAt: { gte: new Date(now - ms) } },
    });
    const [
      users,
      coaches,
      athletes,
      newUsersLast30Days,
      eventsLast7Days,
      onlineNow,
      activeLast24Hours,
      activeLast7Days,
    ] = await Promise.all([
      this.prisma.user.count(),
      // Coaches actually coaching someone (every account has the COACH role).
      this.prisma.user.count({ where: { coachAthletes: { some: {} } } }),
      this.prisma.athlete.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(now - 30 * DAY_IN_MS) } },
      }),
      this.prisma.event.count({
        where: { createdAt: { gte: new Date(now - 7 * DAY_IN_MS) } },
      }),
      this.prisma.user.count(seenSince(ONLINE_WINDOW_MS)),
      this.prisma.user.count(seenSince(DAY_IN_MS)),
      this.prisma.user.count(seenSince(7 * DAY_IN_MS)),
    ]);

    return {
      users,
      coaches,
      athletes,
      newUsersLast30Days,
      eventsLast7Days,
      onlineNow,
      activeLast24Hours,
      activeLast7Days,
    };
  }

  async listUsers(params: {
    search?: string;
    page?: number;
    sort?: AdminUsersSort;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const search = params.search?.trim();
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      params.sort === 'lastSeenAt'
        ? [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { userId: 'desc' }]
        : params.sort === 'lastLoginAt'
          ? [
              { lastLoginAt: { sort: 'desc', nulls: 'last' } },
              { userId: 'desc' },
            ]
          : [{ createdAt: 'desc' }];

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * USERS_PAGE_SIZE,
        take: USERS_PAGE_SIZE,
        select: {
          userId: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          isAdmin: true,
          onboardingCompleted: true,
          createdAt: true,
          lastLoginAt: true,
          lastSeenAt: true,
          _count: { select: { coachAthletes: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize: USERS_PAGE_SIZE,
      users: users.map(({ _count, ...user }) => ({
        ...user,
        coachedAthletesCount: _count.coachAthletes,
      })),
    };
  }

  async listLoginEvents(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });
    if (!user) throw new NotFoundException();

    return this.prisma.loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: LOGIN_EVENTS_LIMIT,
      select: {
        loginEventId: true,
        method: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });
  }
}
