import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import type {
  AuthenticatedRequestUser,
  AuthTokenPayload,
} from '../auth.types';

type RequestWithUser = Request & {
  user?: AuthenticatedRequestUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<RequestWithUser>();

    const authorization =
      request.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException(
        'Autenticación requerida.',
      );
    }

    const token =
      authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException(
        'Autenticación requerida.',
      );
    }

    try {
      const payload =
        await this.jwt.verifyAsync<AuthTokenPayload>(
          token,
        );

      const user =
        await this.authService.currentUser(
          payload.sub,
        );

      if (
        user.companyId !== payload.companyId ||
        user.username !== payload.username
      ) {
        throw new UnauthorizedException(
          'Sesión inválida.',
        );
      }

      request.user = user;

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new UnauthorizedException(
        'Sesión inválida o expirada.',
      );
    }
  }
}