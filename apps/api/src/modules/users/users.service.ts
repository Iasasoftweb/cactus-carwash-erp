import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '@cactus/database';
import {
  ERP_PERMISSIONS,
} from '@cactus/shared';
import type {
  AdminUserResponse,
  PermissionSummaryResponse,
  UserBranchOptionResponse,
  UserRoleSummaryResponse,
} from '@cactus/shared';
import { hash } from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserBranchAccessDto } from './dto/update-user-branch-access.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

type UserAuditActor = {
  userId: string;
  ipAddress: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async syncCashierEmployee(
    tx: Prisma.TransactionClient,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const user = await tx.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        status: true,
        branchAccessMode: true,
        userBranches: {
          select: { branchId: true },
        },
        userRoles: {
          where: {
            role: {
              code: 'CASHIER',
              active: true,
            },
          },
          select: { roleId: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const linkedEmployee = await tx.employee.findUnique({
      where: { userId },
      select: { id: true },
    });

    const hasCashierRole = user.userRoles.length > 0;
    const assignedBranchIds = user.userBranches.map((row) => row.branchId);
    const hasSingleAssignedBranch =
      user.branchAccessMode === 'ASSIGNED' &&
      assignedBranchIds.length === 1;
    const authorized =
      hasCashierRole &&
      hasSingleAssignedBranch &&
      user.status === 'ACTIVE';

    if (!authorized) {
      if (linkedEmployee) {
        await tx.employee.update({
          where: { id: linkedEmployee.id },
          data: {
            canOperateCash: false,
            active: user.status === 'ACTIVE',
          },
        });
      }

      return;
    }

    const branchId = assignedBranchIds[0];

    if (linkedEmployee) {
      await tx.employee.update({
        where: { id: linkedEmployee.id },
        data: {
          branchId,
          fullName: user.fullName,
          jobPosition: 'Cajero',
          canOperateCash: true,
          active: true,
        },
      });
      return;
    }

    await tx.employee.create({
      data: {
        userId: user.id,
        companyId,
        branchId,
        employeeNo: `USR-${user.id.replace(/-/g, '').slice(0, 12)}`,
        fullName: user.fullName,
        phone: null,
        jobPosition: 'Cajero',
        canOperateCash: true,
        active: true,
      },
    });
  }

  private userResponse(user: {
    id: string;
    companyId: string;
    username: string;
    email: string | null;
    fullName: string;
    status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
    branchAccessMode: 'ALL' | 'ASSIGNED';
    createdAt: Date;
    updatedAt: Date;
    userRoles: Array<{
      role: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        active: boolean;
      };
    }>;
    userBranches: Array<{
      branchId: string;
    }>;
  }): AdminUserResponse {
    return {
      id: user.id,
      companyId: user.companyId,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      branchAccessMode: user.branchAccessMode,
      branchIds: user.userBranches
        .map((row) => row.branchId)
        .sort(),
      roles: user.userRoles
        .map((row) => row.role)
        .sort((a, b) => a.name.localeCompare(b.name)),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async findUser(
    companyId: string,
    id: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        userBranches: {
          select: {
            branchId: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Usuario no encontrado.',
      );
    }

    return user;
  }

  private async validateRoles(
    roleIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(roleIds)];

    if (uniqueIds.length === 0) {
      return;
    }

    const count = await this.prisma.role.count({
      where: {
        id: {
          in: uniqueIds,
        },
        active: true,
      },
    });

    if (count !== uniqueIds.length) {
      throw new BadRequestException(
        'Uno o más roles no existen o están inactivos.',
      );
    }
  }

  private async actorPermissionCodes(
    companyId: string,
    actorUserId: string,
  ): Promise<Set<string>> {
    const actor = await this.prisma.user.findFirst({
      where: {
        id: actorUserId,
        companyId,
        status: 'ACTIVE',
      },
      select: {
        userRoles: {
          where: {
            role: {
              active: true,
            },
          },
          select: {
            role: {
              select: {
                permissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!actor) {
      throw new ForbiddenException(
        'El usuario autenticado no está autorizado para administrar roles.',
      );
    }

    return new Set(
      actor.userRoles.flatMap((row) =>
        row.role.permissions.map(
          (permissionRow) =>
            permissionRow.permission.code,
        ),
      ),
    );
  }

  private async assertRolesAssignableByActor(
    companyId: string,
    actorUserId: string,
    roleIds: string[],
  ): Promise<void> {
    const uniqueRoleIds = [...new Set(roleIds)];

    if (uniqueRoleIds.length === 0) {
      return;
    }

    const actorPermissions =
      await this.actorPermissionCodes(
        companyId,
        actorUserId,
      );

    if (
      !actorPermissions.has(
        ERP_PERMISSIONS.userRoleManage,
      )
    ) {
      throw new ForbiddenException(
        'No tienes permiso para asignar roles a usuarios.',
      );
    }

    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: uniqueRoleIds,
        },
        active: true,
      },
      select: {
        id: true,
        name: true,
        permissions: {
          select: {
            permission: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    const unauthorizedRole =
      roles.find((role) =>
        role.permissions.some(
          (permissionRow) =>
            !actorPermissions.has(
              permissionRow.permission.code,
            ),
        ),
      );

    if (unauthorizedRole) {
      throw new ForbiddenException(
        `No puedes asignar el rol "${unauthorizedRole.name}" porque concede permisos que tu cuenta no posee.`,
      );
    }
  }

  private async assertSelfRoleManagementPreserved(
    targetUserId: string,
    actorUserId: string,
    roleIds: string[],
  ): Promise<void> {
    if (targetUserId !== actorUserId) {
      return;
    }

    if (roleIds.length === 0) {
      throw new BadRequestException(
        'No puedes retirar todos tus propios roles.',
      );
    }

    const roleWithManagementPermission =
      await this.prisma.role.findFirst({
        where: {
          id: {
            in: roleIds,
          },
          active: true,
          permissions: {
            some: {
              permission: {
                code: ERP_PERMISSIONS.userRoleManage,
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

    if (!roleWithManagementPermission) {
      throw new BadRequestException(
        'No puedes retirar de tu propia cuenta el permiso para administrar roles.',
      );
    }
  }

  async list(
    companyId: string,
  ): Promise<AdminUserResponse[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        companyId,
      },
      include: {
        userBranches: {
          select: {
            branchId: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: [
        {
          status: 'asc',
        },
        {
          fullName: 'asc',
        },
      ],
    });

    return rows.map((row) =>
      this.userResponse(row),
    );
  }

  async get(
    companyId: string,
    id: string,
  ): Promise<AdminUserResponse> {
    return this.userResponse(
      await this.findUser(companyId, id),
    );
  }

  async roles(): Promise<UserRoleSummaryResponse[]> {
    return this.prisma.role.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async permissions(): Promise<PermissionSummaryResponse[]> {
    return this.prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  async branchOptions(
    companyId: string,
  ): Promise<UserBranchOptionResponse[]> {
    return this.prisma.branch.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
      },
      orderBy: [
        {
          active: 'desc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async create(
    companyId: string,
    dto: CreateUserDto,
    actor: UserAuditActor,
  ): Promise<AdminUserResponse> {
    const username = dto.username.trim();
    const fullName = dto.fullName.trim();
    const email = dto.email?.trim() || null;
    const roleIds = [
      ...new Set(dto.roleIds ?? []),
    ];

    if (!username || !fullName) {
      throw new BadRequestException(
        'Usuario y nombre completo son obligatorios.',
      );
    }

    await this.validateRoles(roleIds);

    await this.assertRolesAssignableByActor(
      companyId,
      actor.userId,
      roleIds,
    );

    const existing =
      await this.prisma.user.findFirst({
        where: {
          companyId,
          OR: [
            {
              username,
            },
            ...(email
              ? [
                  {
                    email,
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Ya existe un usuario con ese username o email.',
      );
    }

    const passwordHash = await hash(
      dto.password,
      12,
    );

    try {
      const created =
        await this.prisma.$transaction(
          async (tx) => {
            const user =
              await tx.user.create({
                data: {
                  companyId,
                  username,
                  email,
                  fullName,
                  passwordHash,
                  status: 'ACTIVE',
                  userRoles:
                    roleIds.length
                      ? {
                          create:
                            roleIds.map(
                              (roleId) => ({
                                roleId,
                              }),
                            ),
                        }
                      : undefined,
                },
                include: {
                  userBranches: {
                    select: {
                      branchId: true,
                    },
                  },
                  userRoles: {
                    include: {
                      role: true,
                    },
                  },
                },
              });

            await tx.auditLog.create({
              data: {
                companyId,
                userId: actor.userId,
                action: 'CREATE_USER',
                entityType: 'USER',
                entityId: user.id,
                reason: null,
                newValues: {
                  username: user.username,
                  email: user.email,
                  fullName: user.fullName,
                  status: user.status,
                  roleIds,
                },
                ipAddress: actor.ipAddress,
              },
            });

            await this.syncCashierEmployee(
              tx,
              companyId,
              user.id,
            );

            return user;
          },
        );

      return this.userResponse(created);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException(
        'Username o email ya utilizado en esta empresa.',
      );
    }
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateUserDto,
    actor: UserAuditActor,
  ): Promise<AdminUserResponse> {
    const current =
      await this.findUser(companyId, id);

    const username = dto.username?.trim();
    const fullName = dto.fullName?.trim();

    if (
      dto.username !== undefined &&
      !username
    ) {
      throw new BadRequestException(
        'El username no puede quedar vacío.',
      );
    }

    if (
      dto.fullName !== undefined &&
      !fullName
    ) {
      throw new BadRequestException(
        'El nombre no puede quedar vacío.',
      );
    }

    try {
      const updated =
        await this.prisma.$transaction(
          async (tx) => {
            const user =
              await tx.user.update({
                where: {
                  id,
                },
                data: {
                  ...(username !== undefined
                    ? {
                        username,
                      }
                    : {}),
                  ...(dto.email !== undefined
                    ? {
                        email:
                          dto.email?.trim() || null,
                      }
                    : {}),
                  ...(fullName !== undefined
                    ? {
                        fullName,
                      }
                    : {}),
                },
                include: {
                  userBranches: {
                    select: {
                      branchId: true,
                    },
                  },
                  userRoles: {
                    include: {
                      role: true,
                    },
                  },
                },
              });

            await tx.auditLog.create({
              data: {
                companyId,
                userId: actor.userId,
                action: 'UPDATE_USER',
                entityType: 'USER',
                entityId: id,
                reason: null,
                oldValues: {
                  username: current.username,
                  email: current.email,
                  fullName: current.fullName,
                },
                newValues: {
                  username: user.username,
                  email: user.email,
                  fullName: user.fullName,
                },
                ipAddress: actor.ipAddress,
              },
            });

            await this.syncCashierEmployee(
              tx,
              companyId,
              id,
            );

            return user;
          },
        );

      return this.userResponse(updated);
    } catch {
      throw new ConflictException(
        'Username o email ya utilizado en esta empresa.',
      );
    }
  }

  async updateStatus(
    companyId: string,
    targetUserId: string,
    actor: UserAuditActor,
    dto: UpdateUserStatusDto,
  ): Promise<AdminUserResponse> {
    const current =
      await this.findUser(
        companyId,
        targetUserId,
      );

    if (
      targetUserId === actor.userId &&
      dto.status !== 'ACTIVE'
    ) {
      throw new BadRequestException(
        'No puedes desactivar o bloquear tu propia cuenta.',
      );
    }

    const updated =
      await this.prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.update({
              where: {
                id: targetUserId,
              },
              data: {
                status: dto.status,
              },
              include: {
                userBranches: {
                  select: {
                    branchId: true,
                  },
                },
                userRoles: {
                  include: {
                    role: true,
                  },
                },
              },
            });

          await tx.auditLog.create({
            data: {
              companyId,
              userId: actor.userId,
              action: 'UPDATE_USER_STATUS',
              entityType: 'USER',
              entityId: targetUserId,
              reason: null,
              oldValues: {
                status: current.status,
              },
              newValues: {
                status: user.status,
              },
              ipAddress: actor.ipAddress,
            },
          });

          await this.syncCashierEmployee(
            tx,
            companyId,
            targetUserId,
          );

          return user;
        },
      );

    return this.userResponse(updated);
  }

  async resetPassword(
    companyId: string,
    id: string,
    dto: ResetUserPasswordDto,
    actor: UserAuditActor,
  ): Promise<{ ok: true }> {
    await this.findUser(companyId, id);

    const passwordHash = await hash(
      dto.password,
      12,
    );

    await this.prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: {
            id,
          },
          data: {
            passwordHash,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: actor.userId,
            action: 'RESET_USER_PASSWORD',
            entityType: 'USER',
            entityId: id,
            reason: null,
            newValues: {
              passwordReset: true,
            },
            ipAddress: actor.ipAddress,
          },
        });
      },
    );

    return {
      ok: true,
    };
  }

  async updateBranchAccess(
    companyId: string,
    targetUserId: string,
    dto: UpdateUserBranchAccessDto,
    actor: UserAuditActor,
  ): Promise<AdminUserResponse> {
    const branchIds =
      dto.branchAccessMode === 'ALL'
        ? []
        : [
            ...new Set(
              dto.branchIds
                .map((id) => id.trim())
                .filter(Boolean),
            ),
          ];

    if (
      dto.branchAccessMode === 'ASSIGNED' &&
      branchIds.length === 0
    ) {
      throw new BadRequestException(
        'Debe asignar al menos una sucursal.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        const lockedUser =
          await tx.$queryRaw<
            Array<{ id: string }>
          >`
            SELECT id
            FROM users
            WHERE id = ${targetUserId}
              AND company_id = ${companyId}
            FOR UPDATE
          `;

        if (lockedUser.length === 0) {
          throw new NotFoundException(
            'Usuario no encontrado.',
          );
        }

        const current =
          await tx.user.findFirst({
            where: {
              id: targetUserId,
              companyId,
            },
            select: {
              branchAccessMode: true,
              userBranches: {
                select: {
                  branchId: true,
                },
              },
            },
          });

        if (!current) {
          throw new NotFoundException(
            'Usuario no encontrado.',
          );
        }

        if (branchIds.length > 0) {
          const validBranches =
            await tx.branch.count({
              where: {
                id: {
                  in: branchIds,
                },
                companyId,
                active: true,
              },
            });

          if (
            validBranches !== branchIds.length
          ) {
            throw new BadRequestException(
              'Una o más sucursales no existen, están inactivas o pertenecen a otra empresa.',
            );
          }
        }

        const oldBranchIds =
          current.userBranches
            .map((row) => row.branchId)
            .sort();

        await tx.user.update({
          where: {
            id: targetUserId,
          },
          data: {
            branchAccessMode:
              dto.branchAccessMode,
          },
        });

        await tx.userBranch.deleteMany({
          where: {
            userId: targetUserId,
          },
        });

        if (branchIds.length > 0) {
          await tx.userBranch.createMany({
            data: branchIds.map(
              (branchId) => ({
                userId: targetUserId,
                branchId,
              }),
            ),
          });
        }

        await this.syncCashierEmployee(
          tx,
          companyId,
          targetUserId,
        );

        await tx.auditLog.create({
          data: {
            companyId,
            userId: actor.userId,
            action:
              'UPDATE_USER_BRANCH_ACCESS',
            entityType: 'USER',
            entityId: targetUserId,
            reason: null,
            oldValues: {
              branchAccessMode:
                current.branchAccessMode,
              branchIds: oldBranchIds,
            },
            newValues: {
              branchAccessMode:
                dto.branchAccessMode,
              branchIds:
                [...branchIds].sort(),
            },
            ipAddress: actor.ipAddress,
          },
        });
      },
    );

    return this.get(
      companyId,
      targetUserId,
    );
  }

  async updateRoles(
    companyId: string,
    targetUserId: string,
    dto: UpdateUserRolesDto,
    actor: UserAuditActor,
  ): Promise<AdminUserResponse> {
    const roleIds = [
      ...new Set(dto.roleIds),
    ];

    await this.validateRoles(roleIds);

    await this.prisma.$transaction(
      async (tx) => {
        /*
         * Serializa modificaciones concurrentes de roles
         * sobre el mismo usuario.
         *
         * El estado actual de roles debe leerse después de
         * adquirir este lock para evitar lost updates y para
         * que la auditoría refleje el estado realmente
         * reemplazado por esta operación.
         */
        const lockedUser =
          await tx.$queryRaw<
            Array<{ id: string }>
          >`
            SELECT id
            FROM users
            WHERE id = ${targetUserId}
              AND company_id = ${companyId}
            FOR UPDATE
          `;

        if (lockedUser.length === 0) {
          throw new NotFoundException(
            'Usuario no encontrado.',
          );
        }

        const current =
          await tx.user.findFirst({
            where: {
              id: targetUserId,
              companyId,
            },
            include: {
              userRoles: {
                include: {
                  role: true,
                },
              },
            },
          });

        if (!current) {
          throw new NotFoundException(
            'Usuario no encontrado.',
          );
        }

        const oldRoleIds =
          current.userRoles
            .map((row) => row.role.id)
            .sort();

        const oldRoleIdSet =
          new Set(oldRoleIds);

        const addedRoleIds =
          roleIds.filter(
            (roleId) =>
              !oldRoleIdSet.has(roleId),
          );

        /*
         * Solo los roles realmente añadidos necesitan pasar
         * por la comprobación de escalación de privilegios.
         */
        await this.assertRolesAssignableByActor(
          companyId,
          actor.userId,
          addedRoleIds,
        );

        /*
         * Si el actor modifica su propia cuenta, debe
         * conservar capacidad de administración de roles.
         */
        await this.assertSelfRoleManagementPreserved(
          targetUserId,
          actor.userId,
          roleIds,
        );

        const newRoleIds =
          [...roleIds].sort();

        await tx.userRole.deleteMany({
          where: {
            userId: targetUserId,
          },
        });

        if (roleIds.length) {
          await tx.userRole.createMany({
            data: roleIds.map(
              (roleId) => ({
                userId: targetUserId,
                roleId,
              }),
            ),
          });
        }

        await this.syncCashierEmployee(
          tx,
          companyId,
          targetUserId,
        );

        await tx.auditLog.create({
          data: {
            companyId,
            userId: actor.userId,
            action: 'UPDATE_USER_ROLES',
            entityType: 'USER',
            entityId: targetUserId,
            reason: null,
            oldValues: {
              roleIds: oldRoleIds,
            },
            newValues: {
              roleIds: newRoleIds,
            },
            ipAddress: actor.ipAddress,
          },
        });
      },
    );

    return this.get(
      companyId,
      targetUserId,
    );
  }
}
