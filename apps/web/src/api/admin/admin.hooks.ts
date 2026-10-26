import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { AdminAPI, type AdminUsersSort } from './admin.api';
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
  sort: AdminUsersSort,
  enabled = true,
) =>
  useQuery({
    enabled,
    queryFn: () => AdminAPI.listUsers(search, page, sort),
    queryKey: [adminKeys.listUsers, search, page, sort],
    placeholderData: keepPreviousData,
  });

export const useAdminLoginEventsQuery = (userId: number | null) =>
  useQuery({
    enabled: userId !== null,
    queryFn: () => AdminAPI.listLoginEvents(userId!),
    queryKey: [adminKeys.listLoginEvents, userId],
  });

export const useAdminDeleteUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: AdminAPI.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adminKeys.listUsers] });
      queryClient.invalidateQueries({ queryKey: [adminKeys.getStats] });
    },
  });
};
