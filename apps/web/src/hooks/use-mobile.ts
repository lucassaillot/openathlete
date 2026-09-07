/**
 * Back-compat re-export. The real implementation lives in
 * `use-breakpoint.ts`, which replaces the old single 768px split with a
 * 4-tier system (see that file for details) — `useIsMobile` now flips at
 * 1024px instead of 768px, so a tablet in portrait consistently gets the
 * compact/mobile treatment instead of the old, badly-broken in-between
 * desktop-grid rendering.
 */
export { useIsMobile } from './use-breakpoint';
