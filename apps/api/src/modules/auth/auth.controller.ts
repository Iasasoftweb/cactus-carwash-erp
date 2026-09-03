import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type {
  AuthLoginResponse,
  AuthUserResponse,
} from '@cactus/shared';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  login(
    @Body() dto: LoginDto,
  ): Promise<AuthLoginResponse> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @CurrentUser() user?: AuthUserResponse,
  ): AuthUserResponse {
    if (!user) {
      throw new UnauthorizedException(
        'Autenticación requerida.',
      );
    }

    return user;
  }
}