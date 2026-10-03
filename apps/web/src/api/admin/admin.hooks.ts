import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { AdminAPI } from './admin.api';
import { adminKeys } from './admin.keys';

export const useAdminStatsQuery = (enabled = true) =>
  useQuery({
    enabled,
    queryFn: AdminAPI.getStats,
    queryKey: [adminKeys.getStats],
  });

export const useAdminUsersQuery = (
  search: string,
  page: number,
  enabled = true,
) =>
  useQuery({
    enabled,
    queryFn: () => AdminAPI.listUsers(search, page),
    queryKey: [adminKeys.listUsers, search, page],
    placeholderData: keepPreviousData,
  });
