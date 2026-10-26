import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { eventKeys } from '../event/event.keys';
import { StrengthAPI } from './strength.api';
import { strengthKeys } from './strength.keys';

type MutationFn<TVariables, TData> = (variables: TVariables) => Promise<TData>;

/** Mutation that refreshes the given query keys once it succeeds. */
function useInvalidatingMutation<TVariables, TData>(
  mutationFn: MutationFn<TVariables, TData>,
  keys: string[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

const PROGRAM_KEYS = [strengthKeys.getPrograms, strengthKeys.getProgram];

// Categories
export const useGetStrengthCategoriesQuery = () =>
  useQuery({
    queryKey: [strengthKeys.getCategories],
    queryFn: StrengthAPI.getCategories,
  });

export const useCreateStrengthCategoryMutation = () =>
  useInvalidatingMutation(StrengthAPI.createCategory, [
    strengthKeys.getCategories,
  ]);

export const useUpdateStrengthCategoryMutation = () =>
  useInvalidatingMutation(StrengthAPI.updateCategory, [
    strengthKeys.getCategories,
    ...PROGRAM_KEYS,
  ]);

export const useDeleteStrengthCategoryMutation = () =>
  useInvalidatingMutation(StrengthAPI.deleteCategory, [
    strengthKeys.getCategories,
    ...PROGRAM_KEYS,
  ]);

// Programs
export const useGetStrengthProgramsQuery = () =>
  useQuery({
    queryKey: [strengthKeys.getPrograms],
    queryFn: StrengthAPI.getPrograms,
  });

export const useGetStrengthProgramQuery = (programId?: number) =>
  useQuery({
    queryKey: [strengthKeys.getProgram, programId],
    queryFn: () => StrengthAPI.getProgram(programId as number),
    enabled: !!programId,
  });

export const useCreateStrengthProgramMutation = () =>
  useInvalidatingMutation(StrengthAPI.createProgram, PROGRAM_KEYS);

export const useUpdateStrengthProgramMutation = () =>
  useInvalidatingMutation(StrengthAPI.updateProgram, PROGRAM_KEYS);

export const useDeleteStrengthProgramMutation = () =>
  useInvalidatingMutation(StrengthAPI.deleteProgram, PROGRAM_KEYS);

export const useCopyStrengthWeekMutation = () =>
  useInvalidatingMutation(StrengthAPI.copyWeek, PROGRAM_KEYS);

export const useDeleteStrengthWeekMutation = () =>
  useInvalidatingMutation(StrengthAPI.deleteWeek, PROGRAM_KEYS);

// Sessions
export const useCreateStrengthSessionMutation = () =>
  useInvalidatingMutation(StrengthAPI.createSession, [
    ...PROGRAM_KEYS,
    strengthKeys.getExercises,
  ]);

export const useUpdateStrengthSessionMutation = () =>
  useInvalidatingMutation(StrengthAPI.updateSession, [
    ...PROGRAM_KEYS,
    strengthKeys.getExercises,
  ]);

export const useDeleteStrengthSessionMutation = () =>
  useInvalidatingMutation(StrengthAPI.deleteSession, PROGRAM_KEYS);

export const useAssignStrengthSessionMutation = () =>
  useInvalidatingMutation(StrengthAPI.assignSession, [eventKeys.getMyEvents]);

// Exercise library
export const useGetStrengthExercisesQuery = () =>
  useQuery({
    queryKey: [strengthKeys.getExercises],
    queryFn: StrengthAPI.getExercises,
  });

export const useUpsertStrengthExerciseMutation = () =>
  useInvalidatingMutation(StrengthAPI.upsertExercise, [
    strengthKeys.getExercises,
  ]);

export const useDeleteStrengthExerciseMutation = () =>
  useInvalidatingMutation(StrengthAPI.deleteExercise, [
    strengthKeys.getExercises,
  ]);
