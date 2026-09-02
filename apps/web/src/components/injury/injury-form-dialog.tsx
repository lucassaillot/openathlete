import { useCreateInjury, useUpdateInjury } from '@/api/injury';
import {
  FormProvider,
  RHFCheckbox,
  RHFDatePicker,
  RHFPainScore,
  RHFSelect,
  RHFTextField,
  RHFTextarea,
} from '@/components/hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SelectItem } from '@/components/ui/select';
import { m } from '@/paraglide/messages';
import { getErrorMessage } from '@/utils/axios';
import { injuryStatusLabelMap } from '@/utils/label-map/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AthleteInjury, INJURY_STATUS } from '@openathlete/shared';

interface P {
  open: boolean;
  onClose: () => void;
  athleteId?: number;
  injury?: AthleteInjury;
}

const injuryFormSchema = z.object({
  location: z.string().min(1),
  painScore: z.number().min(0).max(1),
  status: z.nativeEnum(INJURY_STATUS),
  context: z.string().optional(),
  startDate: z.string(),
  ongoing: z.boolean(),
  endDate: z.string().optional(),
});

type InjuryFormValues = z.infer<typeof injuryFormSchema>;

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function InjuryFormDialog({ open, onClose, athleteId, injury }: P) {
  const edit = !!injury;

  const createInjury = useCreateInjury({
    onSuccess: () => {
      onClose();
      toast.success(m.injury_created_successfully());
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, m.failed_to_create_injury()));
    },
  });

  const updateInjury = useUpdateInjury({
    onSuccess: () => {
      onClose();
      toast.success(m.injury_updated_successfully());
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, m.failed_to_update_injury()));
    },
  });

  const methods = useForm<InjuryFormValues>({
    resolver: zodResolver(injuryFormSchema),
    values: injury
      ? {
          location: injury.location,
          painScore: injury.painScore,
          status: injury.status,
          context: injury.context,
          startDate: formatDateForInput(new Date(injury.startDate)),
          ongoing: !injury.endDate,
          endDate: injury.endDate
            ? formatDateForInput(new Date(injury.endDate))
            : '',
        }
      : {
          location: '',
          painScore: 0,
          status: INJURY_STATUS.STABLE,
          context: '',
          startDate: formatDateForInput(new Date()),
          ongoing: true,
          endDate: '',
        },
  });

  const { handleSubmit, watch } = methods;
  const ongoing = watch('ongoing');
  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');

  const onSubmit = handleSubmit((data) => {
    const body = {
      location: data.location,
      painScore: data.painScore,
      status: data.status,
      context: data.context || '',
      startDate: new Date(data.startDate),
      endDate: data.ongoing || !data.endDate ? null : new Date(data.endDate),
    };

    if (edit && injury) {
      updateInjury.mutate({ athleteInjuryId: injury.athleteInjuryId, body });
    } else if (athleteId) {
      createInjury.mutate({ ...body, athleteId });
    }
  });

  const isPending = createInjury.isPending || updateInjury.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{edit ? m.edit_injury() : m.add_injury()}</DialogTitle>
        </DialogHeader>
        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="flex flex-col gap-4 pt-3"
        >
          <RHFTextField
            name="location"
            label={m.location()}
            placeholder={m.injury_location_placeholder()}
            required
          />

          <RHFPainScore name="painScore" label={m.pain_score()} required />

          <RHFSelect name="status" label={m.status()} required>
            {Object.values(INJURY_STATUS).map((status) => (
              <SelectItem key={status} value={status}>
                {injuryStatusLabelMap[status]}
              </SelectItem>
            ))}
          </RHFSelect>

          <RHFTextarea
            name="context"
            label={m.description()}
            className="min-h-[80px]"
          />

          <div className="grid grid-cols-2 gap-4 items-end">
            <RHFDatePicker
              name="startDate"
              label={m.start_date()}
              required
              max={endDateValue ? new Date(endDateValue) : undefined}
            />
            {!ongoing && (
              <RHFDatePicker
                name="endDate"
                label={m.end_date()}
                min={startDateValue ? new Date(startDateValue) : undefined}
              />
            )}
          </div>

          <RHFCheckbox name="ongoing" label={m.injury_ongoing()} />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              {m.cancel()}
            </Button>
            <Button type="submit" isLoading={isPending}>
              {edit ? m.save() : m.create()}
            </Button>
          </div>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
