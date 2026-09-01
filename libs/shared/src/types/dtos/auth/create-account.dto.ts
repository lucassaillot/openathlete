import { z } from 'zod';

export const createAccountDtoSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  accessCode: z.string().min(1, 'Access code is required'),
  invitationToken: z.string().optional(),
  coachInvitationToken: z.string().optional(),
});

export type CreateAccountDto = z.infer<typeof createAccountDtoSchema>;
