import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@cactus/database';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { AuthLoginResponse, AuthUserResponse } from '@cactus/shared';
import type { LoginDto } from './dto/login.dto';
import type { AuthTokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async userProfile(userId: string): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        userBranches: { select: { branchId: true } },
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || !user.company.active) {
      throw new UnauthorizedException('Sesión inválida o usuario inactivo.');
    }

    const activeRoles = user.userRoles
      .map((row) => row.role)
      .filter((role) => role.active);

    const roles = [...new Set(activeRoles.map((role) => role.code))].sort();
    const permissions = [
      ...new Set(
        activeRoles.flatMap((role) =>
          role.permissions.map((row) => row.permission.code),
        ),
      ),
    ].sort();

    return {
      id: user.id,
      companyId: user.companyId,
      username: user.username,
      fullName: user.fullName,
      roles,
      permissions,
      branchAccessMode: user.branchAccessMode,
      branchIds: user.userBranches.map((row) => row.branchId).sort(),
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }

  async login(dto: LoginDto): Promise<AuthLoginResponse> {
    const username = dto.username.trim();
    const candidates = await this.prisma.user.findMany({
      where: {
        username,
        ...(dto.companyId ? { companyId: dto.companyId } : {}),
      },
      take: 2,
    });

    if (candidates.length !== 1) {
      throw new UnauthorizedException('Usuario o contraseña inválidos.');
    }

    const user = candidates[0];

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario o contraseña inválidos.');
    }

    const validPassword = await compare(dto.password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Usuario o contraseña inválidos.');
    }

    const profile = await this.userProfile(user.id);
    const payload: AuthTokenPayload = {
      sub: profile.id,
      companyId: profile.companyId,
      username: profile.username,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: 8 * 60 * 60,
    });

    return { accessToken, user: profile };
  }

  async currentUser(userId: string): Promise<AuthUserResponse> {
    return this.userProfile(userId);
  }
}
