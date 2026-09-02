import { z } from 'zod';

import { SPORT_TYPE, TRAINING_ZONE_TYPE } from '../../misc';

export const trainingZoneValueDtoSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    sports: z.array(z.nativeEnum(SPORT_TYPE)).min(1),
  })
  .refine((value) => value.min < value.max, {
    message: 'min must be lower than max',
    path: ['max'],
  });

export const createTrainingZoneDtoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(TRAINING_ZONE_TYPE),
  color: z.string(),
  athleteId: z.number(),
  values: z.array(trainingZoneValueDtoSchema).min(1),
});

export const updateTrainingZoneDtoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string(),
  values: z.array(trainingZoneValueDtoSchema).min(1),
});

export const replaceTrainingZoneItemDtoSchema = z.object({
  trainingZoneId: z.number().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string(),
  values: z.array(trainingZoneValueDtoSchema).min(1),
});

export const replaceTrainingZonesDtoSchema = z.object({
  zones: z.array(replaceTrainingZoneItemDtoSchema).min(1),
});

export type TrainingZoneValueDto = z.infer<typeof trainingZoneValueDtoSchema>;
export type CreateTrainingZoneDto = z.infer<typeof createTrainingZoneDtoSchema>;
export type UpdateTrainingZoneDto = z.infer<typeof updateTrainingZoneDtoSchema>;
export type ReplaceTrainingZoneItemDto = z.infer<
  typeof replaceTrainingZoneItemDtoSchema
>;
export type ReplaceTrainingZonesDto = z.infer<
  typeof replaceTrainingZonesDtoSchema
>;
