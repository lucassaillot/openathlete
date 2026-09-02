import { z } from 'zod';

import { INJURY_STATUS } from '../../misc';

export const athleteInjurySchema = z.object({
  athleteInjuryId: z.number(),
  athleteId: z.number(),
  location: z.string(),
  painScore: z.number().min(0).max(1),
  context: z.string(),
  status: z.nativeEnum(INJURY_STATUS),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  sourceActivityId: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AthleteInjury = z.infer<typeof athleteInjurySchema>;

export const createInjuryDtoSchema = z
  .object({
    athleteId: z.number(),
    location: z.string().min(1),
    painScore: z.number().min(0).max(1),
    context: z.string(),
    status: z.nativeEnum(INJURY_STATUS).default(INJURY_STATUS.STABLE),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
  })
  .refine((data) => !data.endDate || data.startDate <= data.endDate, {
    message: 'startDate must be before or equal to endDate',
    path: ['endDate'],
  });

export const updateInjuryDtoSchema = z
  .object({
    location: z.string().min(1).optional(),
    painScore: z.number().min(0).max(1).optional(),
    context: z.string().optional(),
    status: z.nativeEnum(INJURY_STATUS).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    },
  );

export type CreateInjuryDto = z.infer<typeof createInjuryDtoSchema>;
export type UpdateInjuryDto = z.infer<typeof updateInjuryDtoSchema>;
