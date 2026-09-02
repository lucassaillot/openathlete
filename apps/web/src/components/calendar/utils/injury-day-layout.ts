import { AthleteInjury } from '@openathlete/shared';

export interface InjuryDaySegment {
  injury: AthleteInjury;
  isStart: boolean; // True if this day is the start of the injury
  isEnd: boolean; // True if this day is the end of the injury (endDate, or today if ongoing)
  isContinuation: boolean; // True if this is a middle day
  rowIndex: number; // Stable row index for consistent vertical positioning
}

// Global cache for injury row assignments to ensure consistency across all days
const injuryRowCache = new Map<number, number>();
let lastInjurySetHash = '';

function getEffectiveEnd(injury: AthleteInjury): Date {
  const end = injury.endDate ? new Date(injury.endDate) : new Date();
  end.setHours(0, 0, 0, 0);
  return end;
}

/**
 * Calculate row indices for all injuries globally, so the same injury is
 * always drawn on the same row across every day cell it spans.
 * An ongoing injury (no endDate) is treated as ending "today" — it grows
 * one more day every day without ever creating extra rows in the database.
 */
function calculateGlobalRowIndices(
  injuries: AthleteInjury[],
): Map<number, number> {
  const currentHash = injuries
    .map(
      (i) => `${i.athleteInjuryId}-${i.startDate}-${i.endDate}-${i.updatedAt}`,
    )
    .sort()
    .join(',');

  if (currentHash === lastInjurySetHash && injuryRowCache.size > 0) {
    return injuryRowCache;
  }

  injuryRowCache.clear();
  lastInjurySetHash = currentHash;

  const sortedInjuries = [...injuries].sort((a, b) => {
    const aStart = new Date(a.startDate).getTime();
    const bStart = new Date(b.startDate).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return a.athleteInjuryId - b.athleteInjuryId;
  });

  const occupiedRows: Array<{ endTime: number; injuryId: number }[]> = [];

  sortedInjuries.forEach((injury) => {
    const start = new Date(injury.startDate).getTime();
    const end = getEffectiveEnd(injury).getTime();

    let assignedRow = -1;
    for (let rowIdx = 0; rowIdx < occupiedRows.length; rowIdx++) {
      const row = occupiedRows[rowIdx];
      const hasSpace = row.every((item) => item.endTime < start);
      if (hasSpace) {
        assignedRow = rowIdx;
        row.push({ endTime: end, injuryId: injury.athleteInjuryId });
        break;
      }
    }

    if (assignedRow === -1) {
      assignedRow = occupiedRows.length;
      occupiedRows.push([{ endTime: end, injuryId: injury.athleteInjuryId }]);
    }

    injuryRowCache.set(injury.athleteInjuryId, assignedRow);
  });

  return injuryRowCache;
}

/**
 * Calculate which injuries affect a specific day. Mirrors
 * `calculateCyclesForDay`, but the effective end date is `endDate ?? today`
 * so an unresolved injury keeps visually extending day by day without any
 * extra row ever being written to the database.
 */
export function calculateInjuriesForDay(
  injuries: AthleteInjury[],
  day: Date,
): InjuryDaySegment[] {
  const dayNormalized = new Date(day);
  dayNormalized.setHours(0, 0, 0, 0);
  const dayTime = dayNormalized.getTime();

  const rowIndices = calculateGlobalRowIndices(injuries);

  const segments: InjuryDaySegment[] = [];

  injuries.forEach((injury) => {
    const start = new Date(injury.startDate);
    start.setHours(0, 0, 0, 0);
    const end = getEffectiveEnd(injury);

    const startTime = start.getTime();
    const endTime = end.getTime();

    if (dayTime >= startTime && dayTime <= endTime) {
      segments.push({
        injury,
        isStart: dayTime === startTime,
        isEnd: dayTime === endTime,
        isContinuation: dayTime > startTime && dayTime < endTime,
        rowIndex: rowIndices.get(injury.athleteInjuryId) || 0,
      });
    }
  });

  segments.sort((a, b) => a.rowIndex - b.rowIndex);

  return segments;
}
