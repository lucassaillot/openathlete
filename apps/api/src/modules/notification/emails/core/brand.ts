export const brand = {
  // Outer background (email body)
  bg: '#f6f7fb',
  // Default content text color (on white card)
  text: '#050C34',
  // Light foreground for header on navy
  fg: '#EAF0FF',
  // Header background (keep strong contrast for white logo)
  headerBg: '#050C34',
  muted: '#616e99',
  accent: '#00D3A7',
  cardBg: '#ffffff',
  border: '#eef1f7',
  footerBg: '#fafbff',
  // Public absolute URL to a PNG/SVG logo suitable for email clients.
  // Derived from APP_URL (the deployed web app serves this asset itself,
  // e.g. apps/web/public/logo_white.png) rather than a fixed domain.
  logoUrl: `${(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')}/logo_white.png`,
} as const;
