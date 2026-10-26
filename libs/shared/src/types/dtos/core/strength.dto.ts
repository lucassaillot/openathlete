import { z } from 'zod';

// ---------------------------------------------------------------------------
// Session content: free-form blocks. Every field is free text so coaches can
// write "8-10", "max", "30 s", "PDC", "élastique rouge"... without constraint.
// ---------------------------------------------------------------------------

const shortText = z.string().max(100);

export const strengthCustomFieldSchema = z.object({
  label: z.string().max(50),
  value: z.string().max(200),
});

export const strengthExerciseItemSchema = z.object({
  id: z.string().max(50),
  name: z.string().max(200),
  sets: shortText.optional().default(''),
  /** Repetitions or duration, free text ("12", "8-10", "30 s", "max") */
  reps: shortText.optional().default(''),
  load: shortText.optional().default(''),
  rest: shortText.optional().default(''),
  tempo: shortText.optional().default(''),
  side: shortText.optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  mediaUrl: z.string().max(500).optional().default(''),
  /** Coach-defined extra fields (e.g. "Élastique": "rouge") */
  custom: z.array(strengthCustomFieldSchema).max(20).optional().default([]),
});

export const strengthBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exercise'),
    id: z.string().max(50),
    exercise: strengthExerciseItemSchema,
  }),
  z.object({
    type: z.literal('circuit'),
    id: z.string().max(50),
    name: z.string().max(200).optional().default(''),
    rounds: shortText.optional().default(''),
    rest: shortText.optional().default(''),
    notes: z.string().max(2000).optional().default(''),
    exercises: z.array(strengthExerciseItemSchema).max(50),
  }),
  z.object({
    type: z.literal('note'),
    id: z.string().max(50),
    text: z.string().max(5000),
  }),
]);

export const strengthContentSchema = z.object({
  blocks: z.array(strengthBlockSchema).max(100),
});

export type StrengthCustomField = z.infer<typeof strengthCustomFieldSchema>;
export type StrengthExerciseItem = z.infer<typeof strengthExerciseItemSchema>;
export type StrengthBlock = z.infer<typeof strengthBlockSchema>;
export type StrengthContent = z.infer<typeof strengthContentSchema>;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const createStrengthCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
  parentCategoryId: z.number().int().optional().nullable(),
});
export type CreateStrengthCategoryDto = z.infer<
  typeof createStrengthCategorySchema
>;

export const updateStrengthCategorySchema =
  createStrengthCategorySchema.partial();
export type UpdateStrengthCategoryDto = z.infer<
  typeof updateStrengthCategorySchema
>;

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export const createStrengthProgramSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(5000).optional(),
  categoryId: z.number().int().optional().nullable(),
});
export type CreateStrengthProgramDto = z.infer<
  typeof createStrengthProgramSchema
>;

export const updateStrengthProgramSchema =
  createStrengthProgramSchema.partial();
export type UpdateStrengthProgramDto = z.infer<
  typeof updateStrengthProgramSchema
>;

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const createStrengthSessionSchema = z.object({
  weekNumber: z.number().int().min(1).max(200),
  name: z.string().min(1).max(150),
  notes: z.string().max(5000).optional(),
  duration: z.number().int().min(0).max(86400).optional().nullable(),
  content: strengthContentSchema.optional(),
});
export type CreateStrengthSessionDto = z.infer<
  typeof createStrengthSessionSchema
>;

export const updateStrengthSessionSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  notes: z.string().max(5000).optional(),
  duration: z.number().int().min(0).max(86400).optional().nullable(),
  content: strengthContentSchema.optional(),
});
export type UpdateStrengthSessionDto = z.infer<
  typeof updateStrengthSessionSchema
>;

export const assignStrengthSessionSchema = z.object({
  startDate: z.coerce.date(),
  athleteId: z.number().int().optional().nullable(),
});
export type AssignStrengthSessionDto = z.infer<
  typeof assignStrengthSessionSchema
>;

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

export const upsertStrengthExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  defaultNotes: z.string().max(2000).optional(),
  mediaUrl: z.string().max(500).optional().nullable(),
});
export type UpsertStrengthExerciseDto = z.infer<
  typeof upsertStrengthExerciseSchema
>;
