import { m } from '@/paraglide/messages';
import {
  type DistanceUnit,
  METERS_PER_MILE,
  PRESET_DISTANCES,
  splitSeconds,
  toSeconds,
} from '@/utils/running-calculator';
import { cn } from '@/utils/shadcn';
import { useEffect, useId, useRef, useState } from 'react';

import { presetLabel } from './calculator-labels';

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented duration input (h:mm:ss or mm:ss)
// ---------------------------------------------------------------------------

type Segment = 'h' | 'm' | 's';

interface DurationInputProps {
  /** value in seconds */
  value: number | null;
  onChange: (seconds: number | null) => void;
  /** 'hms' for race times, 'ms' for paces */
  format?: 'hms' | 'ms';
  suffix?: string;
  id?: string;
  'aria-label'?: string;
}

function segmentsFrom(value: number | null, format: 'hms' | 'ms') {
  if (value === null) return { h: '', m: '', s: '' };
  const { h, m: min, s } = splitSeconds(value);
  if (format === 'ms') {
    return { h: '', m: String(h * 60 + min), s: String(s).padStart(2, '0') };
  }
  return {
    h: String(h),
    m: String(min).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
}

function secondsFrom(segs: Record<Segment, string>): number | null {
  if (segs.h === '' && segs.m === '' && segs.s === '') return null;
  const total = toSeconds(Number(segs.h), Number(segs.m), Number(segs.s));
  return total > 0 ? total : null;
}

export function DurationInput({
  value,
  onChange,
  format = 'hms',
  suffix,
  id,
  ...rest
}: DurationInputProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const order: Segment[] = format === 'hms' ? ['h', 'm', 's'] : ['m', 's'];
  const [segs, setSegs] = useState(() => segmentsFrom(value, format));
  const refs = useRef<Record<Segment, HTMLInputElement | null>>({
    h: null,
    m: null,
    s: null,
  });

  // Follow external changes (presets, computed values, reset)
  useEffect(() => {
    if (secondsFrom(segs) !== value) setSegs(segmentsFrom(value, format));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, format]);

  const update = (next: Record<Segment, string>) => {
    setSegs(next);
    onChange(secondsFrom(next));
  };

  const handleChange = (seg: Segment, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    update({ ...segs, [seg]: digits });
    const index = order.indexOf(seg);
    if (digits.length >= 2 && index < order.length - 1) {
      const next = refs.current[order[index + 1]];
      next?.focus();
      next?.select();
    }
  };

  const handleKeyDown = (
    seg: Segment,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    const index = order.indexOf(seg);
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.key === 'ArrowUp' ? 1 : -1;
      const unit = seg === 'h' ? 3600 : seg === 'm' ? 60 : 1;
      const current = secondsFrom(segs) ?? 0;
      const next = Math.max(0, current + step * unit * (e.shiftKey ? 10 : 1));
      setSegs(segmentsFrom(next, format));
      onChange(next > 0 ? next : null);
    } else if (e.key === 'Backspace' && segs[seg] === '' && index > 0) {
      refs.current[order[index - 1]]?.focus();
    } else if (e.key === ':' || e.key === '.' || e.key === ',') {
      e.preventDefault();
      refs.current[order[index + 1]]?.focus();
      refs.current[order[index + 1]]?.select();
    }
  };

  // Normalise overflowing values (e.g. 75 min → 1:15:00) on blur
  const handleBlur = () => {
    const total = secondsFrom(segs);
    setSegs(segmentsFrom(total, format));
  };

  const labels: Record<Segment, string> = {
    h: m.calc_unit_hours_short(),
    m: m.calc_unit_minutes_short(),
    s: m.calc_unit_seconds_short(),
  };

  return (
    <div
      className={cn(
        'flex h-14 w-full min-w-0 items-center rounded-xl border border-input bg-background px-2 shadow-xs transition-[color,box-shadow]',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
      )}
      role="group"
      aria-label={rest['aria-label']}
    >
      {order.map((seg, i) => (
        <div key={seg} className="flex min-w-0 flex-1 items-center">
          {i > 0 && (
            <span className="px-0.5 text-xl font-semibold text-muted-foreground">
              :
            </span>
          )}
          <div className="relative flex min-w-0 flex-1 flex-col items-center">
            <input
              ref={(el) => {
                refs.current[seg] = el;
              }}
              id={i === 0 ? baseId : `${baseId}-${seg}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={seg === 'h' ? '0' : '00'}
              value={segs[seg]}
              onChange={(e) => handleChange(seg, e.target.value)}
              onKeyDown={(e) => handleKeyDown(seg, e)}
              onFocus={(e) => e.target.select()}
              onBlur={handleBlur}
              aria-label={labels[seg]}
              className="h-8 w-full min-w-0 bg-transparent text-center text-2xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40"
            />
            <span className="pointer-events-none text-[10px] uppercase leading-none text-muted-foreground">
              {labels[seg]}
            </span>
          </div>
        </div>
      ))}
      {suffix && (
        <span className="shrink-0 pl-1 pr-1 text-sm font-medium text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pace input (always stores s/km, displays in the selected unit)
// ---------------------------------------------------------------------------

export function PaceInput({
  value,
  onChange,
  unit,
  id,
}: {
  /** s/km */
  value: number | null;
  onChange: (secondsPerKm: number | null) => void;
  unit: DistanceUnit;
  id?: string;
}) {
  const factor = unit === 'mi' ? METERS_PER_MILE / 1000 : 1;
  return (
    <DurationInput
      id={id}
      format="ms"
      value={value === null ? null : Math.round(value * factor)}
      onChange={(v) => onChange(v === null ? null : v / factor)}
      suffix={unit === 'mi' ? '/mi' : '/km'}
      aria-label={m.calc_pace()}
    />
  );
}

// ---------------------------------------------------------------------------
// Number input with a unit suffix
// ---------------------------------------------------------------------------

export function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  id,
  step = 'any',
  min = 0,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
  id?: string;
  step?: string | number;
  min?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-14 w-full min-w-0 items-center rounded-xl border border-input bg-background px-3 shadow-xs transition-[color,box-shadow]',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        className,
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        step={step}
        min={min}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ''))}
        onFocus={(e) => e.target.select()}
        className="h-full w-full min-w-0 bg-transparent text-2xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40"
      />
      {suffix && (
        <span className="shrink-0 pl-2 text-sm font-medium text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips / segmented controls
// ---------------------------------------------------------------------------

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-foreground hover:bg-accent',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'grid w-full min-w-0 auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 truncate rounded-lg px-2 text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distance picker: preset chips + free input
// ---------------------------------------------------------------------------

const DEFAULT_DISTANCE_PRESETS = [
  '1k',
  'mile',
  '5k',
  '10k',
  '15k',
  'half',
  'marathon',
  '50k',
  '100k',
];

export function DistancePicker({
  value,
  onChange,
  unit,
  presets = DEFAULT_DISTANCE_PRESETS,
  id,
}: {
  /** meters */
  value: number | null;
  onChange: (meters: number | null) => void;
  unit: DistanceUnit;
  presets?: string[];
  id?: string;
}) {
  const factor = unit === 'mi' ? METERS_PER_MILE : 1000;
  const toText = (meters: number | null) =>
    meters === null ? '' : String(Math.round((meters / factor) * 1000) / 1000);
  const [text, setText] = useState(() => toText(value));

  useEffect(() => {
    const parsed = Number(text.replace(',', '.'));
    if (
      value === null ? text !== '' : Math.abs(parsed * factor - value) > 0.5
    ) {
      setText(toText(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, factor]);

  const handleText = (raw: string) => {
    setText(raw);
    const parsed = Number(raw.replace(',', '.'));
    onChange(
      raw !== '' && Number.isFinite(parsed) && parsed > 0
        ? parsed * factor
        : null,
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <NumberInput
        id={id}
        value={text}
        onChange={handleText}
        suffix={unit}
        placeholder="0"
      />
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {presets.map((key) => {
          const preset = PRESET_DISTANCES.find((p) => p.key === key);
          if (!preset) return null;
          const active =
            value !== null && Math.abs(value - preset.meters) < 0.5;
          return (
            <Chip
              key={key}
              active={active}
              onClick={() => onChange(preset.meters)}
              className="h-8 px-3 text-xs"
            >
              {presetLabel(key)}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
