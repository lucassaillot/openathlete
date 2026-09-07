import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { getDateLocale } from '@/utils/locales';

import { EVENT_TYPE, endOfDay, startOfDay } from '@openathlete/shared';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { CalendarDay } from './calendar-day';
import { CalendarWeekSummary } from './calendar-week-summary';
import { useCalendarContext } from './hooks/use-calendar-context';
import { calculateCyclesForDay } from './utils/cycle-day-layout';
import { calculateInjuriesForDay } from './utils/injury-day-layout';

/**
 * The grid view. `calendar.tsx` only mounts this at the `desktop` tier and
 * above (>= 1024px, see `useIsMobile`) — anything narrower gets
 * `CalendarMobileList` instead, so there is no in-between "8 narrow
 * columns on a tablet" state to design for here, and no need for any
 * mobile-specific branch in this file (there used to be one, gated on
 * Tailwind's `md:` (768px) breakpoint, which never matched by the time
 * this component was reachable — it was dead code).
 */
export function CalendarBody() {
  const {
    displayedWeeks,
    events,
    cycles,
    injuries,
    summaryType,
    setSummaryType,
    cycleResize,
  } = useCalendarContext();

  // Create a modified cycles array with resize preview
  const displayedCycles = cycles.map((cycle) => {
    if (cycleResize && cycle.cycleId === cycleResize.cycleId) {
      return {
        ...cycle,
        startDate: cycleResize.currentStart,
        endDate: cycleResize.currentEnd,
      };
    }
    return cycle;
  });

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border-1 shadow-sm">
      {/* Header row with days */}
      <div className="grid grid-cols-8 border-b-1">
        {displayedWeeks[0].map((day, i) => (
          <div
            key={i}
            className="flex h-8 items-center justify-center text-sm font-semibold [&:not(:last-child)]:border-r-1"
          >
            {new Date(day).toLocaleString(getDateLocale(getLocale()), {
              weekday: 'short',
            })}
          </div>
        ))}
        <div className="h-8">
          <Select value={summaryType} onValueChange={setSummaryType}>
            <SelectTrigger
              className="w-full border-0 py-0 shadow-none"
              style={{ height: '100%' }}
            >
              <SelectValue className="font-bold" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned-done">{m.planned_done()}</SelectItem>
              <SelectItem value="planned">{m.planned()}</SelectItem>
              <SelectItem value="done">{m.done()}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week rows */}
      {displayedWeeks.map((week, weekIndex) => (
        <div
          key={weekIndex}
          className="grid grid-cols-8 [&:not(:last-child)]:border-b-1"
        >
          {week.map((day, i) => (
            <CalendarDay
              key={i}
              day={day}
              events={events.filter(
                (event) =>
                  event.startDate.toDateString() === day.toDateString() &&
                  !(
                    (event.type === EVENT_TYPE.COMPETITION ||
                      event.type === EVENT_TYPE.TRAINING) &&
                    event.relatedActivity
                  ),
              )}
              cycleSegments={calculateCyclesForDay(displayedCycles, day)}
              injurySegments={calculateInjuriesForDay(injuries, day)}
            />
          ))}
          <CalendarWeekSummary
            week={week}
            events={events.filter(
              (event) =>
                event.startDate.getTime() >= startOfDay(week[0]).getTime() &&
                event.startDate.getTime() <= endOfDay(week[6]).getTime(),
            )}
          />
        </div>
      ))}
    </div>
  );
}
