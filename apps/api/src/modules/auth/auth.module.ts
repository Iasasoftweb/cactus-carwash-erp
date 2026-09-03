import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (
        config: ConfigService,
      ) => {
        const secret =
          config.get<string>(
            'AUTH_JWT_SECRET',
          );

        if (!secret) {
          throw new Error(
            'AUTH_JWT_SECRET es obligatorio.',
          );
        }

        return {
          secret,
        };
      },
    }),
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [
    JwtModule,
    AuthService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}