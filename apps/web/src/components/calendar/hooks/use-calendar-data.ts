import { useIsMobile } from '@/hooks/use-mobile';
import { useCallback, useMemo, useState } from 'react';

import { Event } from '@openathlete/shared';

const MOBILE_INITIAL_PAST_MONTHS = 3;
const MOBILE_INITIAL_FUTURE_MONTHS = 6;
const MOBILE_EXTEND_MONTHS = 3;

interface CalendarData {
  defaultMonth?: Date;
  events?: Event[];
}

export function useCalendarData({ defaultMonth, events }: CalendarData) {
  const isMobile = useIsMobile();
  const [displayedMonth, setDisplayedMonth] = useState(
    defaultMonth || new Date(),
  );

  const [mobileRange, setMobileRange] = useState(() => {
    const today = new Date();
    return {
      start: new Date(
        today.getFullYear(),
        today.getMonth() - MOBILE_INITIAL_PAST_MONTHS,
        1,
      ),
      end: new Date(
        today.getFullYear(),
        today.getMonth() + MOBILE_INITIAL_FUTURE_MONTHS + 1,
        0,
      ),
    };
  });

  const extendPast = useCallback(() => {
    setMobileRange((prev) => ({
      ...prev,
      start: new Date(
        prev.start.getFullYear(),
        prev.start.getMonth() - MOBILE_EXTEND_MONTHS,
        1,
      ),
    }));
  }, []);

  const extendFuture = useCallback(() => {
    setMobileRange((prev) => ({
      ...prev,
      end: new Date(
        prev.end.getFullYear(),
        prev.end.getMonth() + MOBILE_EXTEND_MONTHS + 1,
        0,
      ),
    }));
  }, []);

  const nextMonth = useCallback(() => {
    const nextMonth = new Date(
      displayedMonth.setMonth(displayedMonth.getMonth() + 1),
    );
    setDisplayedMonth(nextMonth);
  }, [displayedMonth]);

  const prevMonth = useCallback(() => {
    const prevMonth = new Date(
      displayedMonth.setMonth(displayedMonth.getMonth() - 1),
    );
    setDisplayedMonth(prevMonth);
  }, [displayedMonth]);

  const goToCurrentMonth = useCallback(() => {
    setDisplayedMonth(new Date());
  }, []);

  const displayedWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    const firstDay = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth(),
      1,
    );
    const lastDay = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() + 1,
      0,
    );
    const daysInMonth = lastDay.getDate();
    const firstDayWeek = (firstDay.getDay() + 6) % 7; // Adjust to make Monday the first day
    const lastDayPrevMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth(),
      0,
    );
    const daysInPrevMonth = lastDayPrevMonth.getDate();
    const weeksInMonth = Math.ceil((daysInMonth + firstDayWeek) / 7);
    let day = 1;
    let dayPrevMonth = daysInPrevMonth - firstDayWeek + 1;
    let dayNextMonth = 1;

    // Generate weeks for the displayed month
    for (let i = 0; i < weeksInMonth; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDayWeek) {
          week.push(
            new Date(
              displayedMonth.getFullYear(),
              displayedMonth.getMonth() - 1,
              dayPrevMonth,
            ),
          );
          dayPrevMonth++;
        } else if (day > daysInMonth) {
          week.push(
            new Date(
              displayedMonth.getFullYear(),
              displayedMonth.getMonth() + 1,
              dayNextMonth,
            ),
          );
          dayNextMonth++;
        } else {
          week.push(
            new Date(
              displayedMonth.getFullYear(),
              displayedMonth.getMonth(),
              day,
            ),
          );
          day++;
        }
      }
      weeks.push(week);
    }

    if (isMobile) {
      // Mobile shows a continuous list of full weeks (Monday → Sunday)
      // covering `mobileRange`, which grows as the user scrolls.
      const mobileWeeks: Date[][] = [];
      const cursor = new Date(
        mobileRange.start.getFullYear(),
        mobileRange.start.getMonth(),
        mobileRange.start.getDate(),
      );
      cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
      while (cursor <= mobileRange.end) {
        const week: Date[] = [];
        for (let j = 0; j < 7; j++) {
          week.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        mobileWeeks.push(week);
      }
      return mobileWeeks;
    }

    return weeks;
  }, [displayedMonth, isMobile, mobileRange]);

  return {
    displayedMonth,
    nextMonth,
    prevMonth,
    goToCurrentMonth,
    displayedWeeks,
    extendPast,
    extendFuture,
    events: events || [],
  };
}
