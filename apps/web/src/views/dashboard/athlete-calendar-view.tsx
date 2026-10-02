import { useCalendarEvents } from '@/api/event';
import { Calendar } from '@/components/calendar/calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/utils/shadcn';
import { useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';

interface P {
  athleteId: number;
}

export function AthleteCalendarView({ athleteId }: P) {
  const isMobile = useIsMobile();
  const [range, setRange] = useState<{ start?: Date; end?: Date }>({});

  const { data, isError, isPending, isLoadingRange, isFetching } =
    useCalendarEvents({
      isCoach: true,
      athleteId,
      start: range.start,
      end: range.end,
    });

  const handleRangeChange = useCallback((start: Date, end: Date) => {
    setRange({ start, end });
  }, []);

  if (isError) {
    return <Navigate to="/404" />;
  }
  return (
    <div className={cn('w-full', isMobile ? 'p-0' : 'p-4 md:p-8')}>
      <Calendar
        events={data}
        athleteId={athleteId}
        onRangeChange={handleRangeChange}
        isLoading={isMobile ? isPending : isLoadingRange}
        isFetching={isFetching}
      />
    </div>
  );
}
