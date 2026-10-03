export const ACCESS_TOKEN = 'access_token';
export const REFRESH_TOKEN = 'refresh_token';
export const CALENDAR_COLORED_BY = 'calendar_colored_by';
export const SIDEBAR_OPEN_STATES = 'sidebar_open_states';
export const CURRENT_SPACE = 'current_space';
// Admin's own tokens, kept aside while impersonating another user.
export const ADMIN_ACCESS_TOKEN = 'admin_access_token';
export const ADMIN_REFRESH_TOKEN = 'admin_refresh_token';

export const getItem = (key: string) => localStorage.getItem(key);
export const setItem = (key: string, value: string) =>
  localStorage.setItem(key, value);
export const removeItem = (key: string) => localStorage.removeItem(key);
export const clear = () => localStorage.clear();
