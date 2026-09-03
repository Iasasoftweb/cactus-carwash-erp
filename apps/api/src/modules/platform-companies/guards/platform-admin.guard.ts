import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequestUser } from '../../auth/auth.types';

type PlatformRequest = Request & {
  user?: AuthenticatedRequestUser;
};

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PlatformRequest>();

    if (!request.user?.isPlatformAdmin) {
      throw new ForbiddenException(
        'Esta operación está reservada para el propietario de la plataforma.',
      );
    }

    return true;
  }
}
