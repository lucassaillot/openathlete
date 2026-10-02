import { Loader } from '@/components/ui/loader';
import { m } from '@/paraglide/messages';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { EVENT_TYPE } from '@openathlete/shared';

import { CalendarMobileDay } from './calendar-mobile-day';
import { CalendarMobileScrollToToday } from './calendar-mobile-scroll-to-today';
import { CalendarMobileWeekHeader } from './calendar-mobile-week-header';
import { useCalendarContext } from './hooks/use-calendar-context';
import { calculateCyclesForDay } from './utils/cycle-day-layout';
import { calculateInjuriesForDay } from './utils/injury-day-layout';

interface P {
  isLoading?: boolean;
  isFetching?: boolean;
}

// Load more weeks when the user gets this close (in screen heights) to an edge.
const EXTEND_THRESHOLD_SCREENS = 3;

type ListItem =
  | { type: 'week-header'; week: Date[]; weekIndex: number }
  | { type: 'day'; day: Date; dayIndex: number };

export function CalendarMobileList({ isLoading, isFetching }: P) {
  const {
    displayedWeeks,
    events,
    cycles,
    injuries,
    displayedMonth,
    extendPast,
    extendFuture,
  } = useCalendarContext();

  const parentRef = useRef<HTMLDivElement>(null);
  const [currentScrollIndex, setCurrentScrollIndex] = useState<number | null>(
    null,
  );
  const [isScrollingToToday, setIsScrollingToToday] = useState(false);
  const hasScrolledToTodayRef = useRef(false);
  const scrollAttemptsRef = useRef(0);
  // Infinite scroll bookkeeping: the item count we last extended at (to avoid
  // firing several extensions for the same list), and the scroll position to
  // restore once weeks have been prepended.
  const extendedFutureAtRef = useRef<number | null>(null);
  const extendedPastAtRef = useRef<number | null>(null);
  const pendingPrependRef = useRef<{
    firstKey: string;
    scrollTop: number;
    totalSize: number;
  } | null>(null);

  const items: ListItem[] = useMemo(() => {
    const result: ListItem[] = [];
    if (displayedWeeks && displayedWeeks.length > 0) {
      displayedWeeks.forEach((week, weekIndex) => {
        result.push({
          type: 'week-header',
          week,
          weekIndex,
        });
        week.forEach((day, dayIndex) => {
          result.push({
            type: 'day',
            day,
            dayIndex: weekIndex * 7 + dayIndex,
          });
        });
      });
    }
    return result;
  }, [displayedWeeks]);

  const todayIndex = useMemo(() => {
    return items.findIndex(
      (item) =>
        item.type === 'day' &&
        item.day.toDateString() === new Date().toDateString(),
    );
  }, [items]);

  // Must be referentially stable: a new function on every render makes the
  // virtualizer recompute (and re-render) endlessly.
  const getVirtualItemKey = useCallback(
    (index: number) => getItemKey(items[index]) ?? index,
    [items],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    // Date-based keys keep measured sizes attached to the right day when
    // weeks are prepended.
    getItemKey: getVirtualItemKey,
    estimateSize: (index) => {
      if (index >= items.length || index < 0) {
        return 120;
      }
      const item = items[index];
      if (!item) {
        return 120;
      }
      if (item.type === 'week-header') {
        return 272;
      }
      const dayEvents = events.filter(
        (event) =>
          event.startDate.toDateString() === item.day.toDateString() &&
          !(
            (event.type === EVENT_TYPE.COMPETITION ||
              event.type === EVENT_TYPE.TRAINING) &&
            event.relatedActivity
          ),
      );
      const cycleSegments = calculateCyclesForDay(cycles, item.day);
      const injurySegments = calculateInjuriesForDay(injuries, item.day);
      const dayHeaderHeight = 56;
      let cycleHeight = 0;
      if (cycleSegments.length > 0) {
        cycleHeight = 48;
      }
      let injuryHeight = 0;
      if (injurySegments.length > 0) {
        injuryHeight = 48;
      }
      let eventHeight = 0;
      if (dayEvents.length > 0) {
        eventHeight = 16 + dayEvents.length * 40 + (dayEvents.length - 1) * 8;
      }
      const emptyStateHeight =
        dayEvents.length === 0 &&
        cycleSegments.length === 0 &&
        injurySegments.length === 0
          ? 52
          : 0;

      const calculatedHeight =
        dayHeaderHeight +
        cycleHeight +
        injuryHeight +
        eventHeight +
        emptyStateHeight;

      return Math.max(calculatedHeight, 56);
    },
    overscan: 10,
  });

  useEffect(() => {
    const updateScrollIndex = () => {
      const virtualItems = virtualizer.getVirtualItems();
      // Read the DOM directly: the virtualizer's range lags behind right
      // after weeks are prepended, which would re-trigger extensions.
      const scrollElement = parentRef.current;
      if (scrollElement && hasScrolledToTodayRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const threshold = clientHeight * EXTEND_THRESHOLD_SCREENS;
        if (
          scrollHeight - scrollTop - clientHeight < threshold &&
          extendedFutureAtRef.current !== items.length
        ) {
          extendedFutureAtRef.current = items.length;
          extendFuture();
        } else if (
          scrollTop < threshold &&
          extendedPastAtRef.current !== items.length &&
          !pendingPrependRef.current
        ) {
          extendedPastAtRef.current = items.length;
          pendingPrependRef.current = {
            firstKey: String(getItemKey(items[0])),
            scrollTop,
            totalSize: virtualizer.getTotalSize(),
          };
          extendPast();
        }
      }
      if (virtualItems.length > 0) {
        const firstVisibleIndex = virtualItems[0]?.index ?? 0;
        if (firstVisibleIndex >= 0 && firstVisibleIndex < items.length) {
          setCurrentScrollIndex((prev) => {
            if (prev !== firstVisibleIndex) {
              return firstVisibleIndex;
            }
            return prev;
          });
        }
      } else if (currentScrollIndex === null && items.length > 0) {
        setCurrentScrollIndex(0);
      }
    };

    const scrollElement = parentRef.current;
    if (scrollElement && items.length > 0) {
      updateScrollIndex();
      scrollElement.addEventListener('scroll', updateScrollIndex, {
        passive: true,
      });

      const intervalId = setInterval(updateScrollIndex, 200);

      return () => {
        scrollElement.removeEventListener('scroll', updateScrollIndex);
        clearInterval(intervalId);
      };
    }
  }, [virtualizer, items, currentScrollIndex, extendFuture, extendPast]);

  // After weeks were prepended, shift the scroll position by the height they
  // added so the content on screen doesn't jump.
  useLayoutEffect(() => {
    const pending = pendingPrependRef.current;
    if (!pending || String(getItemKey(items[0])) === pending.firstKey) {
      return;
    }
    pendingPrependRef.current = null;
    const target =
      pending.scrollTop + virtualizer.getTotalSize() - pending.totalSize;
    // Also sync the virtualizer's own offset: until the next scroll event it
    // still holds the old value, and its size-change corrections would
    // otherwise scroll back to it.
    virtualizer.scrollOffset = target;
    if (parentRef.current) {
      parentRef.current.scrollTop = target;
    }
  }, [items, virtualizer]);

  useEffect(() => {
    // Scroll to today only once, on first load. Later data arrivals (more
    // weeks loaded while scrolling) must not move the list.
    if (isLoading || items.length === 0 || hasScrolledToTodayRef.current) {
      return;
    }

    if (
      todayIndex >= 0 &&
      parentRef.current &&
      items.length > todayIndex &&
      !hasScrolledToTodayRef.current
    ) {
      setIsScrollingToToday(true);

      const scrollToToday = () => {
        scrollAttemptsRef.current += 1;
        if (scrollAttemptsRef.current > 20) {
          setCurrentScrollIndex(todayIndex);
          hasScrolledToTodayRef.current = true;
          setIsScrollingToToday(false);
          return;
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              const totalSize = virtualizer.getTotalSize();
              const virtualItems = virtualizer.getVirtualItems();

              const isReady =
                totalSize > 0 &&
                todayIndex >= 0 &&
                todayIndex < items.length &&
                virtualItems.length > 0;

              if (isReady) {
                const hasCalculatedPositions =
                  virtualItems.some(
                    (item) => Math.abs(item.index - todayIndex) <= 5,
                  ) || totalSize > 1000;

                if (hasCalculatedPositions) {
                  virtualizer.scrollToIndex(todayIndex, {
                    align: 'start',
                    behavior: 'auto',
                  });
                  hasScrolledToTodayRef.current = true;
                  setTimeout(() => {
                    const updatedVirtualItems = virtualizer.getVirtualItems();
                    if (updatedVirtualItems.length > 0) {
                      setCurrentScrollIndex(
                        updatedVirtualItems[0]?.index ?? todayIndex,
                      );
                    } else {
                      setCurrentScrollIndex(todayIndex);
                    }
                    setIsScrollingToToday(false);
                  }, 200);
                } else {
                  setTimeout(scrollToToday, 50);
                }
              } else {
                setTimeout(scrollToToday, 50);
              }
            } catch {
              setCurrentScrollIndex(todayIndex);
              hasScrolledToTodayRef.current = true;
              setIsScrollingToToday(false);
            }
          });
        });
      };

      const timeoutId = setTimeout(scrollToToday, 300);

      return () => {
        clearTimeout(timeoutId);
        setIsScrollingToToday(false);
      };
    } else if (items.length > 0 && !hasScrolledToTodayRef.current) {
      setCurrentScrollIndex(0);
      hasScrolledToTodayRef.current = true;
    }
  }, [todayIndex, items.length, virtualizer, isLoading]);

  const handleScrollToToday = () => {
    if (todayIndex >= 0) {
      virtualizer.scrollToIndex(todayIndex, {
        align: 'start',
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader size="lg" />
          <p className="text-sm text-muted-foreground">{m.loading()}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted-foreground">{m.no_events()}</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="w-full overflow-auto bg-background scrollbar-hide relative"
      style={{
        contain: 'strict',
        // `dvh` (not `vh`) so iOS Safari's collapsing URL bar doesn't
        // leave a gap or force a second, outer scroll; no hardcoded
        // `minHeight` floor either — one used to force this list taller
        // than the actual available space on short screens (iPhone SE),
        // producing a double scroll (this list plus the page around it).
        // Header/navbar heights come from the shared tokens in
        // theme/index.css instead of a bare `56px`/`64px`, so this stays
        // correct if either one's own height ever changes.
        height:
          'calc(100dvh - var(--mobile-header-height) - var(--mobile-navbar-height))',
        maxHeight:
          'calc(100dvh - var(--mobile-header-height) - var(--mobile-navbar-height))',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {isScrollingToToday && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-2">
            <Loader size="lg" />
            <p className="text-sm text-muted-foreground">{m.loading()}</p>
          </div>
        </div>
      )}
      {isFetching && !isScrollingToToday && (
        // Zero-height sticky row: floats over the list without shifting it.
        <div className="pointer-events-none sticky top-2 z-20 flex h-0 justify-center">
          <div className="h-fit rounded-full bg-background/90 p-2 shadow-md">
            <Loader size="sm" />
          </div>
        </div>
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().length === 0 && items.length > 0 && (
          <div className="p-4 text-sm text-muted-foreground">{m.loading()}</div>
        )}
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];

          if (!item) {
            return null;
          }

          const isToday =
            item.type === 'day' &&
            item.day.toDateString() === new Date().toDateString();
          const isCurrentMonth =
            item.type === 'day' &&
            item.day.getMonth() === displayedMonth.getMonth();

          if (item.type === 'week-header') {
            const weekEvents = events.filter(
              (event) =>
                event.startDate.getTime() >= item.week[0].getTime() &&
                event.startDate.getTime() <= item.week[6].getTime(),
            );
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <CalendarMobileWeekHeader
                  week={item.week}
                  events={weekEvents}
                />
              </div>
            );
          }

          const dayEvents = events.filter(
            (event) =>
              event.startDate.toDateString() === item.day.toDateString() &&
              !(
                (event.type === EVENT_TYPE.COMPETITION ||
                  event.type === EVENT_TYPE.TRAINING) &&
                event.relatedActivity
              ),
          );
          const cycleSegments = calculateCyclesForDay(cycles, item.day);
          const injurySegments = calculateInjuriesForDay(injuries, item.day);

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <CalendarMobileDay
                day={item.day}
                events={dayEvents}
                cycleSegments={cycleSegments}
                injurySegments={injurySegments}
                isToday={isToday}
                isCurrentMonth={isCurrentMonth}
              />
            </div>
          );
        })}
      </div>
      <CalendarMobileScrollToToday
        scrollToToday={handleScrollToToday}
        todayIndex={todayIndex}
        currentScrollIndex={currentScrollIndex}
        items={items}
        virtualizer={virtualizer}
      />
    </div>
  );
}

function getItemKey(item: ListItem | undefined): string | undefined {
  if (!item) return undefined;
  return item.type === 'week-header'
    ? `week-${item.week[0].toDateString()}`
    : `day-${item.day.toDateString()}`;
}
