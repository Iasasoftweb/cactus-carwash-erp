import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedRequestUser } from '../auth.types';
import {
  REQUIRED_PERMISSIONS_KEY,
} from '../decorators/require-any-permissions.decorator';

type RequestWithUser = Request & {
  user?: AuthenticatedRequestUser;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(
        REQUIRED_PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      ) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<RequestWithUser>();

    const permissions =
      request.user?.permissions ?? [];

    const allowed =
      required.some((permission) =>
        permissions.includes(permission),
      );

    if (!allowed) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción.',
      );
    }

    return true;
  }
}