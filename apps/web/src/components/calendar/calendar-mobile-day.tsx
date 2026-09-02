import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { getDateLocale } from '@/utils/locales';
import { cn } from '@/utils/shadcn';

import { Event } from '@openathlete/shared';

import { CalendarEvent } from './calendar-event';
import { useCalendarContext } from './hooks/use-calendar-context';
import { CycleDaySegment } from './utils/cycle-day-layout';
import { InjuryDaySegment } from './utils/injury-day-layout';

interface P {
  day: Date;
  events: Event[];
  cycleSegments?: CycleDaySegment[];
  injurySegments?: InjuryDaySegment[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

const INJURY_STATUS_COLOR: Record<string, string> = {
  WORSENING: '#dc2626',
  IMPROVING: '#f59e0b',
  STABLE: '#ea580c',
  RESOLVED: '#9ca3af',
};

export function CalendarMobileDay({
  day,
  events,
  cycleSegments = [],
  injurySegments = [],
  isToday,
  isCurrentMonth,
}: P) {
  const { viewInjury } = useCalendarContext();
  const dayOfMonth = day.getDate();
  const dayName = day.toLocaleString(getDateLocale(getLocale()), {
    weekday: 'long',
  });
  const monthName = day.toLocaleString(getDateLocale(getLocale()), {
    month: 'short',
  });

  return (
    <div
      className={cn('flex flex-col bg-background', 'border-b border-border')}
    >
      <div className={cn('flex items-center justify-between px-4 py-3')}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex flex-col items-center justify-center min-w-[48px]',
              isToday && 'text-gray-900 font-bold',
              !isCurrentMonth && 'opacity-40',
            )}
          >
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {dayName.slice(0, 3)}
            </span>
            <span
              className={cn(
                'text-2xl font-semibold',
                isToday && 'text-red-500',
              )}
            >
              {dayOfMonth}
            </span>
          </div>
          <div className="flex flex-col">
            <span
              className={cn(
                'text-sm font-medium',
                isToday && 'text-primary',
                !isCurrentMonth && 'opacity-40',
              )}
            >
              {monthName}
            </span>
          </div>
          {isToday && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </div>
        {events.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {events.length} {events.length === 1 ? m.event() : m.events()}
          </div>
        )}
      </div>
      {cycleSegments.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {cycleSegments.map((segment, idx) => (
            <div
              key={`${segment.cycle.cycleId}-${idx}`}
              className="flex items-center gap-1.5"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: segment.cycle.color || '#3b82f6',
                }}
              />
              <span className="text-xs font-medium text-foreground">
                {segment.cycle.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {injurySegments.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {injurySegments.map((segment, idx) => (
            <button
              key={`${segment.injury.athleteInjuryId}-${idx}`}
              type="button"
              className="flex items-center gap-1.5"
              onClick={() => viewInjury(segment.injury.athleteInjuryId)}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: INJURY_STATUS_COLOR[segment.injury.status],
                }}
              />
              <span className="text-xs font-medium text-foreground">
                🩹 {segment.injury.location}
              </span>
            </button>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {events
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
            .map((event) => (
              <CalendarEvent key={event.eventId} event={event} />
            ))}
        </div>
      )}

      {events.length === 0 &&
        cycleSegments.length === 0 &&
        injurySegments.length === 0 && (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground text-center py-2">
              {m.no_events()}
            </p>
          </div>
        )}
    </div>
  );
}
