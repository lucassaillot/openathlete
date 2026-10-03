import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { Athlete, CoachAthlete, User } from '@openathlete/database';

export type AuthUser = Pick<User, 'userId' | 'email'> & {
  athlete: Pick<Athlete, 'athleteId'> | null;
  coachAthletes?: Array<Pick<CoachAthlete, 'athleteId'>>;
  isAdmin?: boolean;
  /** Set when an admin is browsing as this user (read-only session). */
  impersonatedBy?: number | null;
};

export const JwtUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
