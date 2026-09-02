import {
  useDeleteInjury,
  useGetInjuriesQuery,
  useUpdateInjury,
} from '@/api/injury';
import { ConfirmAction } from '@/components/confirm-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { m } from '@/paraglide/messages';
import { getErrorMessage } from '@/utils/axios';
import { getPainScoreColor } from '@/utils/color';
import { injuryStatusLabelMap } from '@/utils/label-map/core';
import { cn } from '@/utils/shadcn';
import { SettingsSection } from '@/views/dashboard/settings-view/settings-section';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AthleteInjury, INJURY_STATUS } from '@openathlete/shared';

import { InjuryFormDialog } from './injury-form-dialog';

interface P {
  athleteId: number;
}

export function InjuriesCard({ athleteId }: P) {
  const { data: injuries = [], isPending } = useGetInjuriesQuery(athleteId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInjury, setEditingInjury] = useState<AthleteInjury | null>(
    null,
  );
  const [injuryToDelete, setInjuryToDelete] = useState<number | null>(null);

  const updateInjury = useUpdateInjury({
    onError: (error) => {
      toast.error(getErrorMessage(error, m.failed_to_update_injury()));
    },
  });
  const deleteInjury = useDeleteInjury({
    onSuccess: () => {
      toast.success(m.injury_deleted_successfully());
      setInjuryToDelete(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, m.failed_to_delete_injury()));
    },
  });

  const handleAdd = () => {
    setEditingInjury(null);
    setFormOpen(true);
  };

  const handleEdit = (injury: AthleteInjury) => {
    setEditingInjury(injury);
    setFormOpen(true);
  };

  const handleResolve = (injury: AthleteInjury) => {
    updateInjury.mutate({
      athleteInjuryId: injury.athleteInjuryId,
      body: { status: INJURY_STATUS.RESOLVED },
    });
  };

  return (
    <SettingsSection
      title={m.injuries()}
      description={m.injuries_description()}
      action={
        <Button size="sm" onClick={handleAdd}>
          {m.add_injury()}
        </Button>
      }
    >
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : injuries.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {m.no_injuries_found()}
        </div>
      ) : (
        <div className="space-y-3">
          {injuries.map((injury) => (
            <div
              key={injury.athleteInjuryId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{injury.location}</span>
                  <div
                    className={cn(
                      'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold',
                      getPainScoreColor(injury.painScore),
                    )}
                  >
                    {(injury.painScore * 10).toFixed(0)}/10
                  </div>
                  <Badge variant="secondary">
                    {injuryStatusLabelMap[injury.status]}
                  </Badge>
                  {injury.sourceActivityId && (
                    <Badge variant="outline">{m.injury_auto_detected()}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(injury.startDate), 'dd/MM/yyyy', {
                    locale: fr,
                  })}
                  {' → '}
                  {injury.endDate
                    ? format(new Date(injury.endDate), 'dd/MM/yyyy', {
                        locale: fr,
                      })
                    : m.injury_ongoing()}
                </p>
                {injury.context && (
                  <p className="text-sm text-muted-foreground">
                    {injury.context}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {injury.status !== INJURY_STATUS.RESOLVED && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve(injury)}
                    disabled={updateInjury.isPending}
                  >
                    {m.mark_as_resolved()}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(injury)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInjuryToDelete(injury.athleteInjuryId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <InjuryFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        athleteId={athleteId}
        injury={editingInjury || undefined}
      />

      <ConfirmAction
        open={injuryToDelete !== null}
        onClose={() => setInjuryToDelete(null)}
        onConfirm={() => {
          if (injuryToDelete !== null) deleteInjury.mutate(injuryToDelete);
        }}
        title={m.delete_injury()}
        message={m.confirm_delete_injury()}
        isLoading={deleteInjury.isPending}
      />
    </SettingsSection>
  );
}
