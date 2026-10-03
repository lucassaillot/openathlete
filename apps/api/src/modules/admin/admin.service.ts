import { Injectable } from '@nestjs/common';

import { Prisma } from '@openathlete/database';

import { PrismaService } from '../prisma/services/prisma.service';

const USERS_PAGE_SIZE = 20;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = Date.now();
    const [users, coaches, athletes, newUsersLast30Days, eventsLast7Days] =
      await Promise.all([
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
      ]);

    return { users, coaches, athletes, newUsersLast30Days, eventsLast7Days };
  }

  async listUsers(params: { search?: string; page?: number }) {
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

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
}
