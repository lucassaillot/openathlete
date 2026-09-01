import { APP_URL } from '@/config';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LOCALE = 'fr';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/logo_') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|avif)$/)
  ) {
    return NextResponse.next();
  }

  // Check if locale is already in path (must be first segment)
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  const pathnameHasLocale = firstSegment === DEFAULT_LOCALE;

  // Check if path is /auth/login (with or without locale)
  const isAuthLogin =
    pathname === '/auth/login' ||
    (pathnameHasLocale &&
      pathSegments.length === 3 &&
      pathSegments[1] === 'auth' &&
      pathSegments[2] === 'login');

  // Redirect /auth/login to the web app
  if (isAuthLogin) {
    return NextResponse.redirect(`${APP_URL}/auth/login`);
  }

  // French is the only supported locale and is served unprefixed — redirect
  // an explicit /fr prefix (or a legacy /en prefix from before English was
  // dropped) to the equivalent non-prefixed URL, so old bookmarks/backlinks
  // still resolve instead of 404ing.
  if (firstSegment === DEFAULT_LOCALE || firstSegment === 'en') {
    const pathWithoutLocale = pathSegments.slice(1).join('/');
    const redirectPath = pathWithoutLocale ? `/${pathWithoutLocale}` : '/';
    const redirectUrl = new URL(redirectPath, request.url);
    // Preserve query string
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, 301); // Permanent redirect
  }

  // Rewrite to /[locale] route (internal rewrite, URL stays the same)
  const rewritePath =
    pathname === '/' ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
  const newUrl = new URL(rewritePath, request.url);
  return NextResponse.rewrite(newUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
