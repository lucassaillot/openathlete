import * as React from 'react';

/**
 * The app's 4 responsive tiers, replacing the old single mobile/desktop
 * split. Widths are the lower bound of each tier.
 *
 *  - compact  < 640   : phones. 1 column, bottom sheets, bottom navbar.
 *  - mobile   640-1023: phones in landscape and portrait tablets (this is
 *                       the tier that used to fall through the cracks
 *                       between the old 768px mobile/desktop split).
 *  - desktop  1024-1439: sidebar, calendar grid, drag & drop enabled.
 *  - wide     >= 1440  : sidebar + template library + chat window.
 *
 * These map onto Tailwind's default breakpoints (sm/md/lg/xl) so a
 * `lg:` prefix in a className always agrees with `tier !== 'compact' &&
 * tier !== 'mobile'` here — no more mixing `sm:`/`md:` CSS breakpoints
 * against a JS check tuned to a different width.
 */
export const BREAKPOINTS = {
  mobile: 640, // Tailwind `sm`
  desktop: 1024, // Tailwind `lg`
  wide: 1440, // custom, between Tailwind `lg` and `2xl`
} as const;

export type Breakpoint = 'compact' | 'mobile' | 'desktop' | 'wide';

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.mobile) return 'compact';
  if (width < BREAKPOINTS.desktop) return 'mobile';
  if (width < BREAKPOINTS.wide) return 'desktop';
  return 'wide';
}

function readBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  return getBreakpoint(window.innerWidth);
}

/**
 * Current responsive tier. Reads synchronously on first render (via
 * `matchMedia`, not an effect) so there's no flash of the wrong layout
 * before the first paint — the previous single-breakpoint hook returned
 * `false` (desktop) until its first effect ran, which briefly mounted the
 * desktop layout on phones.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] =
    React.useState<Breakpoint>(readBreakpoint);

  React.useEffect(() => {
    const queries = [
      window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 1}px)`),
      window.matchMedia(
        `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
      ),
      window.matchMedia(
        `(min-width: ${BREAKPOINTS.desktop}px) and (max-width: ${BREAKPOINTS.wide - 1}px)`,
      ),
      window.matchMedia(`(min-width: ${BREAKPOINTS.wide}px)`),
    ];

    const onChange = () => setBreakpoint(getBreakpoint(window.innerWidth));

    queries.forEach((mql) => mql.addEventListener('change', onChange));
    // Re-sync once on mount in case the width changed between the
    // initializer running and the listeners being attached.
    onChange();

    return () => {
      queries.forEach((mql) => mql.removeEventListener('change', onChange));
    };
  }, []);

  return breakpoint;
}

/**
 * Back-compat alias for the old single mobile/desktop split, now drawing
 * the line at `desktop` (1024px) instead of 768px — this is what closes
 * the "tablet portrait falls through the cracks" gap: an iPad in portrait
 * (768px) now consistently gets the compact/mobile treatment everywhere
 * this hook is used (dialogs, sidebar, calendar, layout).
 */
export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'compact' || breakpoint === 'mobile';
}

/** True only for the narrowest tier (phones in portrait). */
export function useIsCompact(): boolean {
  return useBreakpoint() === 'compact';
}

/** True only at the widest tier (sidebar + template library + chat). */
export function useIsWide(): boolean {
  return useBreakpoint() === 'wide';
}
