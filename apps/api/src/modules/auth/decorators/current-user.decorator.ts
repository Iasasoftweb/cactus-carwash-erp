import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequestUser } from '../auth.types';

type RequestWithUser = Request & {
  user?: AuthenticatedRequestUser;
};

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedRequestUser | undefined => {
    const request =
      context.switchToHttp().getRequest<RequestWithUser>();

    return request.user;
  },
);