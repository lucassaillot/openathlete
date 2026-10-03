import type { Request } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from 'passport-jwt';

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { ApiEnvSchemaType } from '@openathlete/shared';

import { AuthUser } from '../decorators/user.decorator';
import { AuthService } from '../services';

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    //@ts-ignore
    private readonly configService: ConfigService<ApiEnvSchemaType, true>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow('JWT_SECRET_KEY'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthUser> {
    // Admin impersonation sessions are strictly read-only.
    if (payload.impersonatedBy && !READ_ONLY_METHODS.has(req.method)) {
      throw new ForbiddenException('Read-only impersonation session');
    }
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
