import { useDeleteInjury, useUpdateInjury } from '@/api/injury';
import { m } from '@/paraglide/messages';
import { getPainScoreColor } from '@/utils/color';
import { injuryStatusLabelMap } from '@/utils/label-map/core';
import { cn } from '@/utils/shadcn';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AthleteInjury, INJURY_STATUS } from '@openathlete/shared';

import { ConfirmAction } from '../confirm-action';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Separator } from '../ui/separator';

interface P {
  open: boolean;
  onClose: () => void;
  injury?: AthleteInjury;
  onEditInjury: (athleteInjuryId: AthleteInjury['athleteInjuryId']) => void;
}

export function InjuryDetailsDialog({
  open,
  onClose,
  injury,
  onEditInjury,
}: P) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateInjury = useUpdateInjury({
    onError: () => toast.error(m.failed_to_update_injury()),
  });

  const deleteInjuryMutation = useDeleteInjury({
    onSuccess: () => {
      toast.success(m.injury_deleted_successfully());
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: () => {
      toast.error(m.failed_to_delete_injury());
    },
  });

  if (!injury) return null;

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xl font-semibold">{injury.location}</span>
              <Badge variant="secondary">
                {injuryStatusLabelMap[injury.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 pr-4 -translate-y-4">
              <Button
                onClick={() => onEditInjury(injury.athleteInjuryId)}
                variant="outline"
                size="sm"
              >
                {m.edit()}
              </Button>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium">
              {format(new Date(injury.startDate), 'dd MMMM yyyy', {
                locale: fr,
              })}
              {' → '}
              {injury.endDate
                ? format(new Date(injury.endDate), 'dd MMMM yyyy', {
                    locale: fr,
                  })
                : m.injury_ongoing()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {m.pain_score()}
            </span>
            <div
              className={cn(
                'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold',
                getPainScoreColor(injury.painScore),
              )}
            >
              {(injury.painScore * 10).toFixed(0)}/10
            </div>
          </div>

          <Separator />

          {injury.context ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {m.description()}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {injury.context}
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">
              {m.no_description_provided()}
            </div>
          )}

          {injury.status !== INJURY_STATUS.RESOLVED && (
            <Button
              variant="outline"
              onClick={() =>
                updateInjury.mutate({
                  athleteInjuryId: injury.athleteInjuryId,
                  body: { status: INJURY_STATUS.RESOLVED },
                })
              }
              disabled={updateInjury.isPending}
              isLoading={updateInjury.isPending}
            >
              {m.mark_as_resolved()}
            </Button>
          )}
        </div>
      </DialogContent>

      <ConfirmAction
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          deleteInjuryMutation.mutate(injury.athleteInjuryId);
        }}
        title={m.delete_injury()}
        message={m.confirm_delete_injury()}
        isLoading={deleteInjuryMutation.isPending}
      />
    </Dialog>
  );
}
