import { useDeleteInjury } from '@/api/injury';
import { m } from '@/paraglide/messages';
import { cn } from '@/utils/shadcn';
import { Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { INJURY_STATUS } from '@openathlete/shared';

import { ConfirmAction } from '../confirm-action';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { useCalendarContext } from './hooks/use-calendar-context';
import { InjuryDaySegment } from './utils/injury-day-layout';

interface P {
  segment: InjuryDaySegment;
}

// Fixed color per status so injuries are clearly distinct from cycles
// (which use user-chosen colors) at a glance.
const INJURY_STATUS_COLOR: Record<INJURY_STATUS, string> = {
  [INJURY_STATUS.WORSENING]: '#dc2626', // red-600
  [INJURY_STATUS.IMPROVING]: '#f59e0b', // amber-500
  [INJURY_STATUS.STABLE]: '#ea580c', // orange-600
  [INJURY_STATUS.RESOLVED]: '#9ca3af', // gray-400
};

export function CalendarInjurySegment({ segment }: P) {
  const { viewInjury, editInjury } = useCalendarContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteInjuryMutation = useDeleteInjury({
    onSuccess: () => {
      toast.success(m.injury_deleted_successfully());
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error(m.failed_to_delete_injury());
    },
  });

  let roundedClass = '';
  let leftOffset = '0px';
  let rightOffset = '0px';

  if (segment.isStart && segment.isEnd) {
    roundedClass = 'rounded-md';
    leftOffset = '4px';
    rightOffset = '4px';
  } else if (segment.isStart) {
    roundedClass = 'rounded-l-md';
    leftOffset = '4px';
  } else if (segment.isEnd) {
    roundedClass = 'rounded-r-md';
    rightOffset = '4px';
  }

  const topOffset = segment.rowIndex * 22;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-injury-segment="true"
          className={cn(
            'absolute h-5 text-xs font-semibold text-white flex items-center px-1.5 overflow-hidden cursor-pointer select-none group',
            'hover:brightness-110 transition-all',
            roundedClass,
          )}
          style={{
            backgroundColor: INJURY_STATUS_COLOR[segment.injury.status],
            top: `${topOffset}px`,
            left: leftOffset,
            right: rightOffset,
          }}
          title={`${segment.injury.location}${segment.injury.context ? `\n${segment.injury.context}` : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            viewInjury(segment.injury.athleteInjuryId);
          }}
        >
          {segment.isStart && (
            <span className="truncate pointer-events-none">
              🩹 {segment.injury.location}
            </span>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            editInjury(segment.injury.athleteInjuryId);
          }}
        >
          <Edit2 className="w-4 h-4 mr-2" />
          {m.edit()}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {m.delete_()}
        </ContextMenuItem>
      </ContextMenuContent>

      <ConfirmAction
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          deleteInjuryMutation.mutate(segment.injury.athleteInjuryId);
        }}
        title={m.delete_injury()}
        message={m.confirm_delete_injury()}
        isLoading={deleteInjuryMutation.isPending}
      />
    </ContextMenu>
  );
}
