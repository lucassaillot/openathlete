import client, { routes } from '@/utils/axios';

import { AuthResponseDto, UserRole } from '@openathlete/shared';

export type AdminStats = {
  users: number;
  coaches: number;
  athletes: number;
  newUsersLast30Days: number;
  eventsLast7Days: number;
  onlineNow: number;
  activeLast24Hours: number;
  activeLast7Days: number;
};

export type AdminUser = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isAdmin: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  coachedAthletesCount: number;
};

export type AdminUsersSort = 'createdAt' | 'lastSeenAt' | 'lastLoginAt';

export type AdminLoginEvent = {
  loginEventId: number;
  method: 'PASSWORD' | 'FIREBASE';
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AdminUsersPage = {
  total: number;
  page: number;
  pageSize: number;
  users: AdminUser[];
};

export class AdminAPI {
  static async getStats(): Promise<AdminStats> {
    const res = await client.get(routes.admin.stats);
    return res.data;
  }

  static async listUsers(
    search: string,
    page: number,
    sort: AdminUsersSort,
  ): Promise<AdminUsersPage> {
    const res = await client.get(routes.admin.users, {
      params: { search: search || undefined, page, sort },
    });
    return res.data;
  }

  static async listLoginEvents(userId: number): Promise<AdminLoginEvent[]> {
    const res = await client.get(routes.admin.userLogins(userId));
    return res.data;
  }

  static async impersonate(userId: number): Promise<AuthResponseDto> {
    const res = await client.post(routes.admin.impersonate(userId));
    return res.data;
  }
}
