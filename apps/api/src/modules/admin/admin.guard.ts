import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { AuthUser } from '../auth/decorators/user.decorator';

/**
 * Only real admin sessions: an impersonation session never gets admin rights,
 * even when the impersonated user is an admin.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: AuthUser | null }>();
    return Boolean(user?.isAdmin && !user.impersonatedBy);
  }
}
