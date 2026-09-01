import { useDuplicateEventMutation } from '@/api/event';
import { useCreateEventTemplateMutation } from '@/api/event-template';
import { useIsEventValidated } from '@/hooks/use-event-validation';
import { m } from '@/paraglide/messages';
import { AnalyticsEvent } from '@/utils/analytics-events';
import {
  getEventTypeColor,
  getHighSaturatedRpeColor,
  getLowSaturatedRpeColor,
  getSportColor,
} from '@/utils/color';
import { cn } from '@/utils/shadcn';
import { useDraggable } from '@dnd-kit/core';
import {
  ActivityIcon,
  Copy,
  Edit2,
  FileText,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { useMemo } from 'react';
import { toast } from 'sonner';

import {
  EVENT_TYPE,
  Event,
  SPORT_TYPE,
  formatDistance,
  formatDuration,
} from '@openathlete/shared';

import { SportIcon } from '../sport-icon/sport-icon';
import { Button } from '../ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { CalendarEventTooltipWrapper } from './calendar-event-tooltip-wrapper';
import { useEventClipboard } from './contexts/event-clipboard-context';
import { useEventContextMenu } from './contexts/event-context-menu-context';
import { useCalendarContext } from './hooks/use-calendar-context';
import { COLORED_BY } from './types/filter';

interface P {
  event: Event;
  wrapped?: boolean;
}

function EventSecondLine({ event }: { event: Event }) {
  if (event.type === 'ACTIVITY') {
    if (
      event.sport === SPORT_TYPE.RUNNING ||
      event.sport === SPORT_TYPE.CYCLING ||
      event.sport === SPORT_TYPE.TRAIL_RUNNING ||
      event.sport === SPORT_TYPE.SWIMMING ||
      event.sport === SPORT_TYPE.HIKING
    ) {
      return (
        <div className="flex justify-between w-full">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {formatDuration(event.movingTime)}
          </div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {formatDistance(event.distance, 'km')} km
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex justify-between w-full">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {formatDuration(event.movingTime)}
          </div>
        </div>
      );
    }
  }
  if (event.type === 'TRAINING' || event.type === 'COMPETITION') {
    return (
      <div className="flex justify-between w-full">
        {!!event.goalDuration && (
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {formatDuration(event.goalDuration)}
          </div>
        )}
        {!!event.goalDistance && (
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {formatDistance(event.goalDistance, 'km')} km
          </div>
        )}
      </div>
    );
  }
}

export function CalendarEvent({ event, wrapped }: P) {
  const posthog = usePostHog();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.eventId,
    data: {
      type: 'event',
      event,
    },
  });
  const {
    openEventDetails,
    editEvent,
    deleteEvent,
    events: allEvents,
    coloredBy,
    athleteId,
  } = useCalendarContext();
  const duplicateEventMutation = useDuplicateEventMutation({
    onSuccess: (duplicated) => {
      posthog?.capture(AnalyticsEvent.event_duplicated, {
        event_type: duplicated.type,
      });
    },
  });
  const createEventTemplateMutation = useCreateEventTemplateMutation({
    onSuccess: () => {
      posthog?.capture(AnalyticsEvent.event_template_saved, {
        from: 'calendar_menu',
      });
      toast.success(m.template_saved_successfully());
    },
  });
  const isValidated = useIsEventValidated(event, athleteId);
  const { copyEvent } = useEventClipboard();
  const { isAnyContextMenuOpen, setContextMenuOpen } = useEventContextMenu();

  const eventColor = useMemo(() => {
    switch (coloredBy || COLORED_BY.TYPE) {
      case COLORED_BY.TYPE:
        return getEventTypeColor(event.type);
      case COLORED_BY.SPORT: {
        const sport = event.type !== EVENT_TYPE.NOTE ? event.sport : null;
        if (sport === null)
          return 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700/50';
        return getSportColor(sport);
      }
      case COLORED_BY.RPE: {
        const rpe =
          event.type === EVENT_TYPE.ACTIVITY
            ? event.rpe
            : event.type === EVENT_TYPE.TRAINING ||
                event.type === EVENT_TYPE.COMPETITION
              ? event.goalRpe
              : null;
        if (rpe === null)
          return 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700/50';
        return getLowSaturatedRpeColor(rpe);
      }
    }
  }, [event, coloredBy]);

  const draggable = event.type !== EVENT_TYPE.ACTIVITY && !wrapped;
  const relatedEvents = allEvents.filter(
    (e) =>
      (e.type === EVENT_TYPE.TRAINING || e.type === EVENT_TYPE.COMPETITION) &&
      e.relatedActivity?.eventId === event.eventId,
  );
  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          setContextMenuOpen(event.eventId, open);
        }}
      >
        <ContextMenuTrigger className="w-full relative block">
          <CalendarEventTooltipWrapper
            event={event}
            disabled={isDragging || isAnyContextMenuOpen}
          >
            <div
              className={cn(
                'calendar-event relative rounded-sm cursor-pointer text-left flex flex-col items-start justify-center py-0.5 px-1 overflow-hidden w-full',
                eventColor,
                wrapped ? 'border-2' : '',
                !isValidated ? 'opacity-60' : '',
                isDragging ? 'opacity-30' : '',
              )}
              ref={draggable ? setNodeRef : undefined}
              {...(draggable ? { ...listeners, ...attributes } : {})}
              onClick={(e) => {
                openEventDetails(event.eventId);
                e.stopPropagation();
              }}
              onMouseEnter={(e) => {
                if (wrapped) {
                  e.stopPropagation();
                }
              }}
              onMouseLeave={(e) => {
                if (wrapped) {
                  e.stopPropagation();
                }
              }}
            >
              <div className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis px-1 pr-5">
                {event.type !== EVENT_TYPE.NOTE && (
                  <SportIcon
                    sport={event.sport}
                    className="inline-block mr-1"
                  />
                )}
                {event.type === EVENT_TYPE.ACTIVITY && event.rpe !== null && (
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full inline-block mr-1',
                      getHighSaturatedRpeColor(event.rpe),
                    )}
                  />
                )}
                {(event.type === EVENT_TYPE.TRAINING ||
                  event.type === EVENT_TYPE.COMPETITION) &&
                  event.goalRpe !== null && (
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full inline-block mr-1',
                        getHighSaturatedRpeColor(event.goalRpe),
                      )}
                    />
                  )}
                {event.type === EVENT_TYPE.TRAINING &&
                  'workout' in event &&
                  event.workout &&
                  event.workout.steps.length > 0 && (
                    <ActivityIcon className="inline-block w-3 h-3 mr-1 text-gray-600 dark:text-gray-400" />
                  )}
                {event.name}
              </div>
              <div className="px-1 w-full">
                <EventSecondLine event={event} />
              </div>
              {relatedEvents.length > 0 && (
                <div className="flex flex-col gap-1 mt-1 w-full mb-0.5">
                  {relatedEvents.map((relatedEvent) => (
                    <CalendarEvent
                      key={relatedEvent.eventId}
                      event={relatedEvent}
                      wrapped
                    />
                  ))}
                </div>
              )}
            </div>
          </CalendarEventTooltipWrapper>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-0.5 right-0.5 h-6 w-6 rounded-full shadow-sm border border-border/50 opacity-80 hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                aria-label={m.actions()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() => {
                  editEvent(event.eventId);
                }}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {m.edit()}
              </DropdownMenuItem>
              {event.type === EVENT_TYPE.TRAINING && (
                <DropdownMenuItem
                  onClick={() => {
                    createEventTemplateMutation.mutate({
                      eventId: event.eventId,
                    });
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {m.save_as_template()}
                </DropdownMenuItem>
              )}
              {event.type !== EVENT_TYPE.ACTIVITY && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      duplicateEventMutation.mutate({
                        eventId: event.eventId,
                      });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {m.duplicate()}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      copyEvent(event);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {m.copy()}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  deleteEvent(event.eventId);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {m.delete_()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={(e) => {
              editEvent(event.eventId);
              e.stopPropagation();
            }}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            {m.edit()}
          </ContextMenuItem>
          {event.type === EVENT_TYPE.TRAINING && (
            <ContextMenuItem
              onClick={(e) => {
                createEventTemplateMutation.mutate({
                  eventId: event.eventId,
                });
                e.stopPropagation();
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              {m.save_as_template()}
            </ContextMenuItem>
          )}
          {event.type !== EVENT_TYPE.ACTIVITY && (
            <>
              <ContextMenuItem
                onClick={(e) => {
                  duplicateEventMutation.mutate({ eventId: event.eventId });
                  e.stopPropagation();
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                {m.duplicate()}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={(e) => {
                  copyEvent(event);
                  e.stopPropagation();
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                {m.copy()}
              </ContextMenuItem>
            </>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={(e) => {
              deleteEvent(event.eventId);
              e.stopPropagation();
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {m.delete_()}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
