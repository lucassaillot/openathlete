import {
  useDeleteInjury,
  useGetInjuriesQuery,
  useUpdateInjury,
} from '@/api/injury';
import { ConfirmAction } from '@/components/confirm-action';
import { InjuryFormDialog } from '@/components/injury/injury-form-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { m } from '@/paraglide/messages';
import { getErrorMessage } from '@/utils/axios';
import { getPainScoreColor } from '@/utils/color';
import { injuryStatusLabelMap } from '@/utils/label-map/core';
import { cn } from '@/utils/shadcn';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AthleteInjury, INJURY_STATUS } from '@openathlete/shared';

interface InjuryLogsTableProps {
  athleteId?: number;
  className?: string;
  onAdd?: () => void;
}

export function InjuryLogsTable({
  athleteId,
  className,
  onAdd,
}: InjuryLogsTableProps) {
  const { data: injuries = [], isLoading } = useGetInjuriesQuery(athleteId);
  const [editingInjury, setEditingInjury] = useState<AthleteInjury>();
  const [injuryToDelete, setInjuryToDelete] = useState<number>();
  const updateInjury = useUpdateInjury({
    onSuccess: () => toast.success(m.injury_updated_successfully()),
    onError: (error) =>
      toast.error(getErrorMessage(error, m.failed_to_update_injury())),
  });
  const deleteInjury = useDeleteInjury({
    onSuccess: () => {
      toast.success(m.injury_deleted_successfully());
      setInjuryToDelete(undefined);
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, m.failed_to_delete_injury())),
  });

  const addButton = (
    <Button size="sm" onClick={onAdd}>
      <Plus className="mr-2 h-4 w-4" />
      {m.add_injury()}
    </Button>
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{m.injury_logs()}</CardTitle>
          <CardDescription>{m.injury_logs_description()}</CardDescription>
        </div>
        <div className="hidden md:block">{addButton}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Table>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonTableRow key={i} colCount={6} />
              ))}
            </TableBody>
          </Table>
        ) : injuries.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {m.no_injuries_found()}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.date()}</TableHead>
                <TableHead>{m.location()}</TableHead>
                <TableHead>{m.pain_score()}</TableHead>
                <TableHead>{m.status()}</TableHead>
                <TableHead>{m.context()}</TableHead>
                <TableHead className="text-right">{m.actions()}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {injuries.map((injury) => (
                <TableRow key={injury.athleteInjuryId}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(injury.startDate), 'dd/MM/yyyy', {
                      locale: fr,
                    })}
                    {' → '}
                    {injury.endDate
                      ? format(new Date(injury.endDate), 'dd/MM/yyyy', {
                          locale: fr,
                        })
                      : m.injury_ongoing()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {injury.location}
                  </TableCell>
                  <TableCell>
                    <div
                      className={cn(
                        'inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold',
                        getPainScoreColor(injury.painScore),
                      )}
                    >
                      {(injury.painScore * 10).toFixed(0)}/10
                    </div>
                  </TableCell>
                  <TableCell>{injuryStatusLabelMap[injury.status]}</TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TableCell className="max-w-md truncate">
                        {injury.context}
                      </TableCell>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">{injury.context}</p>
                    </TooltipContent>
                  </Tooltip>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {injury.status !== INJURY_STATUS.RESOLVED && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={m.mark_as_resolved()}
                          disabled={updateInjury.isPending}
                          onClick={() =>
                            updateInjury.mutate({
                              athleteInjuryId: injury.athleteInjuryId,
                              body: { status: INJURY_STATUS.RESOLVED },
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={m.edit_injury()}
                        onClick={() => setEditingInjury(injury)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={m.delete_injury()}
                        onClick={() =>
                          setInjuryToDelete(injury.athleteInjuryId)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <InjuryFormDialog
        open={!!editingInjury}
        onClose={() => setEditingInjury(undefined)}
        injury={editingInjury}
      />
      <ConfirmAction
        open={injuryToDelete !== undefined}
        onClose={() => setInjuryToDelete(undefined)}
        onConfirm={() => {
          if (injuryToDelete !== undefined) {
            deleteInjury.mutate(injuryToDelete);
          }
        }}
        title={m.delete_injury()}
        message={m.confirm_delete_injury()}
        isLoading={deleteInjury.isPending}
      />
    </Card>
  );
}
