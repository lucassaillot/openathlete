#!/usr/bin/env node
/**
 * Static scanner for responsive anti-patterns in apps/web/src/**\/*.tsx.
 *
 * This is deliberately a plain regex scan over className strings, not a
 * real CSS/AST analysis — it's meant to catch the recurring, mechanical
 * mistakes that caused the mobile/tablet overflow bugs (see the responsive
 * audit), not to be a general-purpose linter. Keep it fast and dependency-free
 * so it can run as part of `pnpm lint` without adding a devDependency.
 *
 * Exit code 1 (and a non-empty report) fails the lint step.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = join(new URL('.', import.meta.url).pathname, '..', 'src');

/** Files/dirs that are allowed to use fixed pixel widths without a
 * responsive prefix — generally because the fixed size is intentional
 * (icons, avatars, tight controls) rather than a content container. */
const IGNORED_DIR_SEGMENTS = new Set(['ui', 'assets', 'icons']);

/** @type {{name: string, test: (line: string) => boolean, message: string}[]} */
const RULES = [
  {
    name: 'fixed-width-no-responsive-prefix',
    test: (line) => {
      // Matches w-[123px] / min-w-[123px] / max-w-[123px] that is NOT
      // preceded by a responsive variant prefix (sm:/md:/lg:/xl:/2xl:) and
      // NOT wrapped in a calc()/percentage (those are usually fine).
      const re = /(?<![\w:-])(?:min-|max-)?w-\[(\d+)px\]/g;
      let m;
      while ((m = re.exec(line))) {
        const px = Number(m[1]);
        if (px < 40) continue; // small fixed controls (icons, handles) are fine
        const before = line.slice(0, m.index);
        // If a responsive variant of the same utility appears anywhere on
        // the line, assume it's intentionally overridden and skip.
        const utility = m[0].replace(/^(min-|max-)?w-/, '');
        const hasResponsiveVariant = new RegExp(
          `\\b(sm|md|lg|xl|2xl):(?:min-|max-)?w-\\[?${utility.replace(/[[\]]/g, '\\$&')}`,
        ).test(line);
        if (hasResponsiveVariant) continue;
        if (/\b(sm|md|lg|xl|2xl):/.test(before.slice(-4))) continue;
        return true;
      }
      return false;
    },
    message:
      'fixed pixel width (>= 40px) without a responsive variant — add a sm:/md: override or use a relative unit',
  },
  {
    name: 'col-span-in-single-col-grid',
    test: (line) =>
      /grid-cols-1\b(?![^"'`]*\b(sm|md|lg|xl|2xl):grid-cols)/.test(line) === false &&
      false, // placeholder disabled below; real check is cross-line, see checkColSpan()
    message: '',
    disabled: true,
  },
];

/** @type {string[]} */
const findings = [];

function listTsxFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listTsxFiles(full));
    } else if (extname(entry) === '.tsx' || extname(entry) === '.ts') {
      out.push(full);
    }
  }
  return out;
}

const SUPPRESS_RE = /oa-responsive-ok(?::\s*(.*))?/;

function isSuppressed(lines, idx) {
  // Accept the suppression comment on the flagged line itself or the
  // line immediately above it (for multi-line JSX attributes).
  return SUPPRESS_RE.test(lines[idx]) || (idx > 0 && SUPPRESS_RE.test(lines[idx - 1]));
}

function checkFixedWidths(file, lines) {
  lines.forEach((line, idx) => {
    if (isSuppressed(lines, idx)) return;
    for (const rule of RULES) {
      if (rule.disabled) continue;
      if (rule.test(line)) {
        findings.push(
          `${relative(process.cwd(), file)}:${idx + 1}  [${rule.name}]  ${rule.message}\n    ${line.trim()}`,
        );
      }
    }
  });
}

/**
 * Cross-line check: a `col-span-N` (N >= 2) class used inside a JSX block
 * whose nearest ancestor `grid grid-cols-1` (in the same file, textually
 * preceding) has no responsive override, AND the col-span itself has no
 * responsive prefix. This is intentionally approximate (textual proximity,
 * not real JSX tree walking) — good enough to catch the pattern that broke
 * activity-details-overview-tab.tsx and records-view.tsx without needing a
 * real parser.
 */
function checkColSpanPattern(file, content) {
  const gridColsSingleRe = /grid-cols-1\b/g;
  if (!gridColsSingleRe.test(content)) return;

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const colSpanRe = /(?<![\w:-])col-span-(\d+)/g;
    let m;
    while ((m = colSpanRe.exec(line))) {
      const n = Number(m[1]);
      if (n < 2) continue;
      const before = line.slice(0, m.index);
      const hasPrefix = /\b(sm|md|lg|xl|2xl):$/.test(before) || /\b(sm|md|lg|xl|2xl):col-span-\d+/.test(line);
      if (hasPrefix) continue;
      if (isSuppressed(lines, idx)) continue;
      findings.push(
        `${relative(process.cwd(), file)}:${idx + 1}  [col-span-no-prefix]  ` +
          `col-span-${n} with no responsive prefix in a file using grid-cols-1 — ` +
          `this creates an implicit extra column on mobile\n    ${line.trim()}`,
      );
    }
  });
}

function checkWhitespaceNowrapOnDynamicText(file, content) {
  // Heuristic: whitespace-nowrap on a line that also renders a JSX
  // expression (`{something}`) rather than a static label — a strong sign
  // it's wrapping user/data-driven text, which is exactly the pattern that
  // caused calendar titles and target badges to overflow.
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (!/whitespace-nowrap/.test(line)) return;
    if (!/\{[^}]*\}/.test(line)) return;
    if (isSuppressed(lines, idx)) return;
    // Skip obvious safe cases: icons, short static enum-like values are
    // still risky, so no extra skip here — just report for human review.
    findings.push(
      `${relative(process.cwd(), file)}:${idx + 1}  [nowrap-on-dynamic-text]  ` +
        `whitespace-nowrap alongside a JSX expression — confirm the text is ` +
        `short/static, otherwise use truncate or remove nowrap\n    ${line.trim()}`,
    );
  });
}

const files = listTsxFiles(ROOT);
for (const file of files) {
  const relDir = relative(ROOT, file).split('/')[0];
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');

  if (!IGNORED_DIR_SEGMENTS.has(relDir)) {
    checkFixedWidths(file, lines);
  }
  checkColSpanPattern(file, content);
  checkWhitespaceNowrapOnDynamicText(file, content);
}

if (findings.length > 0) {
  console.error(
    `\n[check-responsive] ${findings.length} potential responsive issue(s) found:\n`,
  );
  console.error(findings.join('\n\n'));
  console.error(
    '\nIf a finding is a deliberate exception (e.g. a genuinely fixed-size ' +
      'control), fix the flagged utility so it carries a responsive variant ' +
      'or falls under an ignored directory rather than suppressing this check.\n',
  );
  process.exit(1);
} else {
  console.log('[check-responsive] no issues found.');
}
