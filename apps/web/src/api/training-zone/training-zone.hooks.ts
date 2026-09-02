import {
  MutationOptions,
  QueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  ReplaceTrainingZoneItemDto,
  TRAINING_ZONE_TYPE,
  UpdateTrainingZoneDto,
} from '@openathlete/shared';

import { athleteKeys } from '../athlete/athlete.keys';
import { TrainingZoneAPI } from './training-zone.api';
import { trainingZoneKeys } from './training-zone.keys';

export const useGetTrainingZones = (
  athleteId: number,
  opt?: QueryOptions<
    Awaited<ReturnType<typeof TrainingZoneAPI.getAllForAthlete>>
  > & { enabled?: boolean },
) =>
  useQuery({
    ...opt,
    queryFn: () => TrainingZoneAPI.getAllForAthlete(athleteId),
    queryKey: [trainingZoneKeys.getAllForAthlete, athleteId],
    enabled: opt?.enabled ?? !!athleteId,
  });

function useInvalidateTrainingZoneQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: [trainingZoneKeys.getAllForAthlete],
    });
    queryClient.invalidateQueries({
      queryKey: [athleteKeys.getMyAthlete],
    });
    queryClient.invalidateQueries({
      queryKey: [athleteKeys.getCoachedAthletes],
    });
  };
}

export const useCreateTrainingZone = (
  opt?: MutationOptions<
    Awaited<ReturnType<typeof TrainingZoneAPI.create>>,
    Error,
    Parameters<typeof TrainingZoneAPI.create>[0]
  >,
) => {
  const invalidate = useInvalidateTrainingZoneQueries();
  return useMutation({
    ...opt,
    mutationFn: TrainingZoneAPI.create,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (opt?.onSuccess)
        opt.onSuccess(data, variables, onMutateResult, context);
      invalidate();
    },
  });
};

export const useUpdateTrainingZone = (
  opt?: MutationOptions<
    Awaited<ReturnType<typeof TrainingZoneAPI.update>>,
    Error,
    { trainingZoneId: number; body: UpdateTrainingZoneDto }
  >,
) => {
  const invalidate = useInvalidateTrainingZoneQueries();
  return useMutation({
    ...opt,
    mutationFn: ({ trainingZoneId, body }) =>
      TrainingZoneAPI.update(trainingZoneId, body),
    onSuccess: (data, variables, onMutateResult, context) => {
      if (opt?.onSuccess)
        opt.onSuccess(data, variables, onMutateResult, context);
      invalidate();
    },
  });
};

export const useDeleteTrainingZone = (
  opt?: MutationOptions<
    Awaited<ReturnType<typeof TrainingZoneAPI.delete>>,
    Error,
    number
  >,
) => {
  const invalidate = useInvalidateTrainingZoneQueries();
  return useMutation({
    ...opt,
    mutationFn: TrainingZoneAPI.delete,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (opt?.onSuccess)
        opt.onSuccess(data, variables, onMutateResult, context);
      invalidate();
    },
  });
};

export const useReplaceTrainingZonesForType = (
  opt?: MutationOptions<
    Awaited<ReturnType<typeof TrainingZoneAPI.replaceForType>>,
    Error,
    {
      athleteId: number;
      type: TRAINING_ZONE_TYPE;
      zones: ReplaceTrainingZoneItemDto[];
    }
  >,
) => {
  const invalidate = useInvalidateTrainingZoneQueries();
  return useMutation({
    ...opt,
    mutationFn: ({ athleteId, type, zones }) =>
      TrainingZoneAPI.replaceForType(athleteId, type, zones),
    onSuccess: (data, variables, onMutateResult, context) => {
      if (opt?.onSuccess)
        opt.onSuccess(data, variables, onMutateResult, context);
      invalidate();
    },
  });
};
