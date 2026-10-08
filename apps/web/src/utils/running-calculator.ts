/**
 * Pure running calculations used by the calculator page.
 *
 * Units, unless stated otherwise:
 * - distance: meters
 * - time / duration: seconds
 * - pace: seconds per kilometer
 * - speed: km/h
 */

export const METERS_PER_MILE = 1609.344;

export type DistanceUnit = 'km' | 'mi';

export interface PresetDistance {
  key: string;
  meters: number;
}

export const PRESET_DISTANCES: PresetDistance[] = [
  { key: '400m', meters: 400 },
  { key: '800m', meters: 800 },
  { key: '1k', meters: 1000 },
  { key: '1500m', meters: 1500 },
  { key: 'mile', meters: METERS_PER_MILE },
  { key: '3k', meters: 3000 },
  { key: '5k', meters: 5000 },
  { key: '10k', meters: 10000 },
  { key: '15k', meters: 15000 },
  { key: 'half', meters: 21097.5 },
  { key: '30k', meters: 30000 },
  { key: 'marathon', meters: 42195 },
  { key: '50k', meters: 50000 },
  { key: '100k', meters: 100000 },
];

const isPositive = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

// ---------------------------------------------------------------------------
// Formatting / parsing
// ---------------------------------------------------------------------------

/** Formats seconds as h:mm:ss (or m:ss when under an hour). */
export function formatDuration(
  totalSeconds: number | null | undefined,
  opts: { decimals?: boolean; forceHours?: boolean } = {},
): string {
  if (
    totalSeconds === null ||
    totalSeconds === undefined ||
    !Number.isFinite(totalSeconds) ||
    totalSeconds < 0
  ) {
    return '—';
  }
  const value = totalSeconds;
  const rounded = opts.decimals
    ? Math.round(value * 10) / 10
    : Math.round(value);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const rawSeconds = rounded - hours * 3600 - minutes * 60;
  const seconds = opts.decimals
    ? rawSeconds.toFixed(1).padStart(4, '0')
    : String(Math.round(rawSeconds)).padStart(2, '0');
  if (hours > 0 || opts.forceHours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  }
  return `${minutes}:${seconds}`;
}

/** Formats a pace (seconds per unit) as m:ss. */
export function formatPace(secondsPerUnit: number | null | undefined): string {
  if (!isPositive(secondsPerUnit)) return '—';
  return formatDuration(secondsPerUnit);
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formats a distance in meters for display, e.g. "10 km", "400 m". */
export function formatDistance(meters: number, unit: DistanceUnit = 'km') {
  if (unit === 'mi') {
    return `${formatNumber(meters / METERS_PER_MILE, 2)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const decimals = Number.isInteger(km)
    ? 0
    : km * 10 === Math.round(km * 10)
      ? 1
      : 2;
  return `${formatNumber(km, decimals)} km`;
}

export function toSeconds(h: number, m: number, s: number): number {
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

export function splitSeconds(totalSeconds: number): {
  h: number;
  m: number;
  s: number;
} {
  const rounded = Math.round(Math.max(0, totalSeconds));
  return {
    h: Math.floor(rounded / 3600),
    m: Math.floor((rounded % 3600) / 60),
    s: rounded % 60,
  };
}

// ---------------------------------------------------------------------------
// Pace / time / distance
// ---------------------------------------------------------------------------

export function paceFromTime(meters: number, seconds: number): number | null {
  if (!isPositive(meters) || !isPositive(seconds)) return null;
  return seconds / (meters / 1000);
}

export function timeFromPace(meters: number, pace: number): number | null {
  if (!isPositive(meters) || !isPositive(pace)) return null;
  return (meters / 1000) * pace;
}

export function distanceFromPace(seconds: number, pace: number): number | null {
  if (!isPositive(seconds) || !isPositive(pace)) return null;
  return (seconds / pace) * 1000;
}

export function paceToSpeedKmh(pace: number | null): number | null {
  if (!isPositive(pace)) return null;
  return 3600 / pace;
}

export function speedKmhToPace(kmh: number | null): number | null {
  if (!isPositive(kmh)) return null;
  return 3600 / kmh;
}

export function pacePerKmToPerMile(pace: number | null): number | null {
  if (!isPositive(pace)) return null;
  return (pace * METERS_PER_MILE) / 1000;
}

export function pacePerMileToPerKm(pace: number | null): number | null {
  if (!isPositive(pace)) return null;
  return (pace * 1000) / METERS_PER_MILE;
}

// ---------------------------------------------------------------------------
// Splits
// ---------------------------------------------------------------------------

export interface Split {
  index: number;
  /** cumulated distance at the end of the split */
  distance: number;
  /** length of this split */
  length: number;
  splitTime: number;
  cumulativeTime: number;
  /** pace of this split, s/km */
  pace: number;
}

/**
 * Computes split times. `splitPercent` is the gap between the two halves:
 * negative = second half faster (negative split), positive = slower.
 * e.g. -2 → second half pace is 2% faster than the first half pace.
 * The overall time is always preserved.
 */
export function computeSplits(
  meters: number,
  totalSeconds: number,
  interval: number,
  splitPercent = 0,
): Split[] {
  if (
    !isPositive(meters) ||
    !isPositive(totalSeconds) ||
    !isPositive(interval)
  ) {
    return [];
  }
  // Avoid rendering absurdly large tables
  const count = Math.ceil(meters / interval - 1e-9);
  if (count > 500) return [];

  const avgPace = totalSeconds / (meters / 1000);
  const r = splitPercent / 100;
  const firstHalfPace = (2 * avgPace) / (2 + r);
  const secondHalfPace = firstHalfPace * (1 + r);
  const half = meters / 2;

  const timeAt = (d: number) => {
    const first = Math.min(d, half);
    const second = Math.max(0, d - half);
    return (first / 1000) * firstHalfPace + (second / 1000) * secondHalfPace;
  };

  const splits: Split[] = [];
  let prevDistance = 0;
  let prevTime = 0;
  for (let i = 1; i <= count; i++) {
    const distance = Math.min(i * interval, meters);
    const cumulativeTime = i === count ? totalSeconds : timeAt(distance);
    const length = distance - prevDistance;
    const splitTime = cumulativeTime - prevTime;
    splits.push({
      index: i,
      distance,
      length,
      splitTime,
      cumulativeTime,
      pace: splitTime / (length / 1000),
    });
    prevDistance = distance;
    prevTime = cumulativeTime;
  }
  return splits;
}

// ---------------------------------------------------------------------------
// Race prediction
// ---------------------------------------------------------------------------

export function riegelPredict(
  refMeters: number,
  refSeconds: number,
  targetMeters: number,
  exponent = 1.06,
): number | null {
  if (
    !isPositive(refMeters) ||
    !isPositive(refSeconds) ||
    !isPositive(targetMeters)
  ) {
    return null;
  }
  return refSeconds * Math.pow(targetMeters / refMeters, exponent);
}

/** Oxygen cost (ml/kg/min) of running at `v` meters per minute (Daniels & Gilbert). */
function oxygenCost(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

/** Fraction of VO2max sustainable for `t` minutes (Daniels & Gilbert). */
function sustainableFraction(t: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * t) +
    0.2989558 * Math.exp(-0.1932605 * t)
  );
}

/** Velocity (m/min) at which the oxygen cost equals `vo2`. */
function velocityForVo2(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vo2;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

export function vdotFromPerformance(
  meters: number,
  seconds: number,
): number | null {
  if (!isPositive(meters) || !isPositive(seconds)) return null;
  const t = seconds / 60;
  const v = meters / t;
  const vdot = oxygenCost(v) / sustainableFraction(t);
  return Number.isFinite(vdot) && vdot > 0 ? vdot : null;
}

/** Race time (s) predicted by a VDOT for a given distance (bisection). */
export function timeFromVdot(vdot: number, meters: number): number | null {
  if (!isPositive(vdot) || !isPositive(meters)) return null;
  let lo = 1; // seconds
  let hi = 60 * 60 * 72;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const v = vdotFromPerformance(meters, mid) ?? 0;
    // Slower time → lower VDOT
    if (v > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Pace (s/km) at a given fraction of VO2max for a VDOT. */
export function paceAtVo2Fraction(
  vdot: number,
  fraction: number,
): number | null {
  if (!isPositive(vdot) || !isPositive(fraction)) return null;
  const v = velocityForVo2(vdot * fraction);
  if (!isPositive(v)) return null;
  return 60000 / v;
}

export type DanielsZoneKey = 'E' | 'M' | 'T' | 'I' | 'R';

export interface PaceRange {
  key: string;
  /** slowest pace of the range (s/km) */
  slow: number;
  /** fastest pace of the range (s/km) */
  fast: number;
}

/** Daniels training paces. */
export function danielsPaces(vdot: number): PaceRange[] {
  if (!isPositive(vdot)) return [];
  const range = (key: DanielsZoneKey, low: number, high: number) => ({
    key,
    slow: paceAtVo2Fraction(vdot, low) as number,
    fast: paceAtVo2Fraction(vdot, high) as number,
  });
  const marathon = timeFromVdot(vdot, 42195);
  const marathonPace = marathon ? marathon / 42.195 : 0;
  return [
    range('E', 0.65, 0.74),
    { key: 'M', slow: marathonPace, fast: marathonPace },
    range('T', 0.86, 0.88),
    range('I', 0.975, 1.0),
    range('R', 1.05, 1.08),
  ];
}

// ---------------------------------------------------------------------------
// VMA (maximal aerobic speed)
// ---------------------------------------------------------------------------

export interface VmaZone {
  key: string;
  low: number; // % VMA
  high: number; // % VMA
}

export const VMA_ZONES: VmaZone[] = [
  { key: 'recovery', low: 50, high: 60 },
  { key: 'endurance', low: 60, high: 70 },
  { key: 'active', low: 70, high: 80 },
  { key: 'threshold', low: 80, high: 90 },
  { key: 'long_intervals', low: 90, high: 95 },
  { key: 'short_intervals', low: 95, high: 105 },
  { key: 'sprint', low: 105, high: 120 },
];

export function vmaZones(vma: number): PaceRange[] {
  if (!isPositive(vma)) return [];
  return VMA_ZONES.map((z) => ({
    key: z.key,
    slow: speedKmhToPace((vma * z.low) / 100) as number,
    fast: speedKmhToPace((vma * z.high) / 100) as number,
  }));
}

/** Half-Cooper test: distance covered in 6 minutes at VMA. */
export function vmaFromHalfCooper(meters: number): number | null {
  if (!isPositive(meters)) return null;
  return meters / 100;
}

/** Cooper test: distance covered in 12 minutes. */
export function vmaFromCooper(meters: number): number | null {
  if (!isPositive(meters)) return null;
  const vo2max = (meters - 504.9) / 44.73;
  return vo2max > 0 ? vo2max / 3.5 : null;
}

/** Velocity at VO2max (km/h) for a given VDOT — a good VMA estimate. */
export function vmaFromVdot(vdot: number): number | null {
  if (!isPositive(vdot)) return null;
  return (velocityForVo2(vdot) * 60) / 1000;
}

/** VO2max estimate (ml/kg/min) from VMA (Léger: 3.5 ml/kg/min per km/h). */
export function vo2maxFromVma(vma: number): number | null {
  if (!isPositive(vma)) return null;
  return vma * 3.5;
}

/** Time (s) to cover `meters` at `percent`% of `vma`. */
export function intervalTime(
  meters: number,
  vma: number,
  percent: number,
): number | null {
  if (!isPositive(meters) || !isPositive(vma) || !isPositive(percent)) {
    return null;
  }
  const speedMs = (vma * percent) / 100 / 3.6;
  return meters / speedMs;
}

// ---------------------------------------------------------------------------
// Heart rate
// ---------------------------------------------------------------------------

export function maxHrFox(age: number): number | null {
  if (!isPositive(age)) return null;
  return 220 - age;
}

export function maxHrTanaka(age: number): number | null {
  if (!isPositive(age)) return null;
  return 208 - 0.7 * age;
}

export interface HrZone {
  key: string;
  low: number; // % (of max HR, or of HR reserve with Karvonen)
  high: number;
  bpmLow: number;
  bpmHigh: number;
}

const HR_ZONE_DEFS = [
  { key: 'z1', low: 50, high: 60 },
  { key: 'z2', low: 60, high: 70 },
  { key: 'z3', low: 70, high: 80 },
  { key: 'z4', low: 80, high: 90 },
  { key: 'z5', low: 90, high: 100 },
];

/** HR zones in % of max HR, or Karvonen (HR reserve) when `rest` is provided. */
export function hrZones(max: number, rest?: number | null): HrZone[] {
  if (!isPositive(max)) return [];
  const useReserve = isPositive(rest) && (rest as number) < max;
  const base = useReserve ? (rest as number) : 0;
  const span = max - base;
  return HR_ZONE_DEFS.map((z) => ({
    ...z,
    bpmLow: Math.round(base + (span * z.low) / 100),
    bpmHigh: Math.round(base + (span * z.high) / 100),
  }));
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

/**
 * Relative effort of running on a slope compared to flat ground. Empirical
 * fit of grade-adjusted-pace curves: uphill costs more, gentle downhill
 * helps up to ~-11%, steeper descents stop helping.
 */
export function gradeEffortFactor(gradePercent: number): number {
  const g = Math.max(-30, Math.min(30, gradePercent || 0));
  return 1 + 0.02911 * g + 0.0013 * g * g;
}

/** Flat-equivalent pace (s/km) of a pace run on a given slope. */
export function gradeAdjustedPace(
  pace: number,
  gradePercent: number,
): number | null {
  if (!isPositive(pace)) return null;
  return pace / gradeEffortFactor(gradePercent);
}
