/**
 * Dev-only diagnostic that flags elements causing horizontal overflow.
 *
 * Two kinds of overflow are detected:
 *  - "scroller": the element's own content is wider than the element
 *    (`scrollWidth > clientWidth`). If the element (or an ancestor up to
 *    2 levels) doesn't explicitly opt into horizontal scrolling
 *    (`overflow-x: auto|scroll`), this is almost always a bug.
 *  - "poke": the element's rendered box extends past its parent's box
 *    (e.g. an absolutely positioned or non-scrolling child), which slips
 *    past the scrollWidth check entirely.
 *
 * Never imported in production: only wired up from `main.tsx` behind
 * `import.meta.env.DEV`.
 */

const SCAN_DEBOUNCE_MS = 400;
const TOLERANCE_PX = 1;

let scheduled = false;
let observer: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
const alreadyWarned = new WeakSet<Element>();

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls =
    typeof el.className === 'string' && el.className
      ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
      : '';
  const dataSlot = el.getAttribute('data-slot');
  const slot = dataSlot ? `[data-slot="${dataSlot}"]` : '';
  return `${tag}${id}${cls}${slot}`;
}

function path(el: Element, depth = 4): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && parts.length < depth) {
    parts.unshift(describe(node));
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function hasOptedIntoScroll(el: Element): boolean {
  let node: Element | null = el;
  let hops = 0;
  while (node && hops < 3) {
    const style = window.getComputedStyle(node);
    if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
      return true;
    }
    node = node.parentElement;
    hops++;
  }
  return false;
}

function scan() {
  scheduled = false;

  const viewportWidth = document.documentElement.clientWidth;
  const elements = document.body.querySelectorAll<HTMLElement>('*');

  elements.forEach((el) => {
    if (alreadyWarned.has(el)) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // detached / display:none

    // Case 1: element's own content overflows its box.
    if (el.scrollWidth - el.clientWidth > TOLERANCE_PX) {
      if (!hasOptedIntoScroll(el)) {
        alreadyWarned.add(el);
        console.error(
          `[overflow-guard] scroller — ${describe(el)} content is ${
            el.scrollWidth - el.clientWidth
          }px wider than its box (no ancestor within 3 hops opts into overflow-x). Path: ${path(el)}`,
          el,
        );
      }
      return;
    }

    // Case 2: element pokes past the right edge of the viewport itself.
    if (
      rect.right - viewportWidth > TOLERANCE_PX &&
      rect.left < viewportWidth
    ) {
      alreadyWarned.add(el);
      console.error(
        `[overflow-guard] poke — ${describe(el)} extends ${Math.round(
          rect.right - viewportWidth,
        )}px past the viewport's right edge. Path: ${path(el)}`,
        el,
      );
    }
  });
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(scan, SCAN_DEBOUNCE_MS);
}

/**
 * Start watching the page for horizontal overflow. Safe to call once at
 * app startup; it stays alive for the life of the tab.
 */
export function initOverflowGuard(): void {
  if (typeof window === 'undefined') return;

  schedule();
  window.addEventListener('resize', schedule);

  observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  // Re-check when any observed element resizes (e.g. a dialog opening).
  resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(document.body);

  console.error(
    '[overflow-guard] active (dev only) — watching for horizontal overflow. ' +
      'Warnings below point at the element responsible.',
  );
}
