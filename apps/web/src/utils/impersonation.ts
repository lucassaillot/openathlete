import { AdminAPI } from '@/api/admin';
import { getPath } from '@/routes/paths';

import {
  ACCESS_TOKEN,
  ADMIN_ACCESS_TOKEN,
  ADMIN_REFRESH_TOKEN,
  CURRENT_SPACE,
  REFRESH_TOKEN,
  getItem,
  removeItem,
  setItem,
} from './local-storage';

/**
 * Switches the session to `userId` (read-only, enforced by the API). The
 * admin's own tokens are kept aside so `stopImpersonation` can restore them.
 */
export async function startImpersonation(userId: number) {
  const { accessToken, refreshToken } = await AdminAPI.impersonate(userId);

  setItem(ADMIN_ACCESS_TOKEN, getItem(ACCESS_TOKEN) ?? '');
  setItem(ADMIN_REFRESH_TOKEN, getItem(REFRESH_TOKEN) ?? '');
  setItem(ACCESS_TOKEN, accessToken);
  setItem(REFRESH_TOKEN, refreshToken);
  // Let the impersonated user's default space apply.
  removeItem(CURRENT_SPACE);

  // Full reload: drops every cached query of the admin session.
  window.location.href = getPath(['dashboard']);
}

export function stopImpersonation() {
  const adminAccessToken = getItem(ADMIN_ACCESS_TOKEN);
  const adminRefreshToken = getItem(ADMIN_REFRESH_TOKEN);

  if (adminAccessToken) setItem(ACCESS_TOKEN, adminAccessToken);
  else removeItem(ACCESS_TOKEN);
  if (adminRefreshToken) setItem(REFRESH_TOKEN, adminRefreshToken);
  else removeItem(REFRESH_TOKEN);
  removeItem(ADMIN_ACCESS_TOKEN);
  removeItem(ADMIN_REFRESH_TOKEN);
  removeItem(CURRENT_SPACE);

  window.location.href = getPath(['dashboard', 'admin']);
}
