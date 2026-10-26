import { getPath } from '@/routes/paths';

export const programPath = (programId: number) =>
  `${getPath(['dashboard', 'strength'])}/${programId}`;
