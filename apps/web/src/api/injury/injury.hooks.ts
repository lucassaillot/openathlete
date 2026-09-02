import {
  MutationOptions,
  QueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { UpdateInjuryDto } from '@openathlete/shared';

import { InjuryAPI } from './injury.api';
import { injuryKeys } from './injury.keys';

export function useGetInjuriesQuery(
  athleteId?: number,
  opt?: QueryOptions<Awaited<ReturnType<typeof InjuryAPI.getInjuries>>>,
) {
  return useQuery({
    ...opt,
    queryKey: [injuryKeys.getInjuries, athleteId],
    queryFn: () => InjuryAPI.getInjuries(athleteId),
  });
}

export const useCreateInjury = (
  opt?: MutationOptions<
    Awaited<ReturnType<typeof InjuryAPI.create>>,
    Error,
    Parameters<typeof InjuryAPI.create>[0]
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...opt,
    mutationFn: InjuryAPI.create,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (opt?.onSuccess)
        opt.onSuccess(data, variables, onMutateResult, context);
      queryClient.invalidateQueries({ queryKey: [injuryKeys.getInjuries] });
    },
  });
};

export const useUpdateInjury = (
  opt?: MutationOptions<
    Awaited<ReturnType<typeof InjuryAPI.update>>,
    Error,
    { athleteInjuryId: number; body: UpdateInjuryDto }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...opt,
    mutationFn: ({ athleteInjuryId, body }) =>
      InjuryAPI.update(athleteInjuryId, body),
    onSuccess: (data, variables, onMutateResult, context) => {
      if (opt?.onSuccess)
        opt.onSuccess(data, variables, onMutateResult, context);
      queryClient.invalidateQueries({ queryKey: [injuryKeys.getInjuries] });
    },
  });
};

export const useDeleteInjury = (
  opt?: MutationOptions<
    Awaited<ReturnType<typeof InjuryAPI.delete>>,
    Error,
    number
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...opt,
    mutationFn: InjuryAPI.delete,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (opt?.onSuccess)
        opt.onSuccess(data, variables, onMutateResult, context);
      queryClient.invalidateQueries({ queryKey: [injuryKeys.getInjuries] });
    },
  });
};
