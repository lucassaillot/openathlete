import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { m } from '@/paraglide/messages';
import { cn } from '@/utils/shadcn';
import { Check, Copy, Download, Info, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ZONE_COLORS } from './calculator-labels';

/** Two columns on desktop (inputs | sticky results), stacked on mobile. */
export function ToolLayout({
  inputs,
  results,
  resultsFirstOnMobile,
}: {
  inputs: React.ReactNode;
  results: React.ReactNode;
  /** show the result above the inputs on small screens */
  resultsFirstOnMobile?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4">{inputs}</div>
      <div
        className={cn(
          'flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start',
          resultsFirstOnMobile && 'order-first lg:order-none',
        )}
      >
        {results}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-5 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold leading-tight">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex shrink-0 gap-1">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Big highlighted result. */
export function ResultHero({
  label,
  value,
  unit,
  sub,
  children,
  info,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  info?: React.ReactNode;
}) {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-md sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary-foreground/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-10 size-40 rounded-full bg-primary-foreground/5"
      />
      <div className="relative flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
          {label}
          {info && <InfoTip inverted>{info}</InfoTip>}
        </div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span
            className="break-all text-5xl font-bold tracking-tight tabular-nums sm:text-6xl"
            aria-live="polite"
          >
            {value}
          </span>
          {unit && (
            <span className="text-lg font-medium text-primary-foreground/70">
              {unit}
            </span>
          )}
        </div>
        {sub && <div className="text-sm text-primary-foreground/80">{sub}</div>}
      </div>
      {children && (
        <div className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-primary-foreground/15 pt-4 sm:grid-cols-3">
          {children}
        </div>
      )}
    </section>
  );
}

export function HeroStat({
  label,
  value,
  unit,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] uppercase tracking-wide text-primary-foreground/60">
        {label}
      </div>
      <div className="truncate text-lg font-semibold tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-primary-foreground/70">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 rounded-xl bg-muted/60 p-3', className)}>
      <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-xl font-semibold tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function InfoTip({
  children,
  inverted,
}: {
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={m.calc_how_computed()}
          className={cn(
            'inline-flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors',
            inverted
              ? 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] text-sm normal-case tracking-normal">
        <p className="mb-1 font-semibold">{m.calc_how_computed()}</p>
        <div className="text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

/** One zone line: colour dot, name/description, main value, secondary value. */
export function ZoneRow({
  colorIndex,
  name,
  description,
  value,
  secondary,
  extra,
}: {
  colorIndex: number;
  name: React.ReactNode;
  description?: React.ReactNode;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex min-w-0 items-stretch gap-3 py-3">
      <span
        aria-hidden
        className={cn(
          'w-1.5 shrink-0 rounded-full',
          ZONE_COLORS[colorIndex % ZONE_COLORS.length],
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="truncate font-medium">{name}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
        <div className="flex min-w-0 shrink-0 flex-col sm:items-end">
          <div className="text-lg font-semibold tabular-nums">{value}</div>
          {secondary && (
            <div className="text-xs text-muted-foreground tabular-nums">
              {secondary}
            </div>
          )}
          {extra}
        </div>
      </div>
    </li>
  );
}

export function EmptyResult({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground"
    >
      <RotateCcw className="size-3.5" />
      <span className="hidden sm:inline">{m.calc_reset()}</span>
    </Button>
  );
}

export function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      toast.success(m.calc_copied());
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(m.calc_copy_failed());
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {m.calc_copy()}
    </Button>
  );
}

export function DownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Download className="size-3.5" />
      {m.calc_download()}
    </Button>
  );
}
