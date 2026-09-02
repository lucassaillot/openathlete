// PACE training zones are stored internally as decimal minutes per km (e.g. 5.5 = 5:30/km).

export function decimalMinutesToMinSec(value: number): {
  minutes: number;
  seconds: number;
} {
  if (!Number.isFinite(value) || value < 0) return { minutes: 0, seconds: 0 };
  const minutes = Math.floor(value);
  const seconds = Math.round((value - minutes) * 60);
  return seconds === 60
    ? { minutes: minutes + 1, seconds: 0 }
    : { minutes, seconds };
}

export function minSecToDecimalMinutes(
  minutes: number,
  seconds: number,
): number {
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  return safeMinutes + safeSeconds / 60;
}

export function formatPaceLabel(value: number): string {
  const { minutes, seconds } = decimalMinutesToMinSec(value);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
