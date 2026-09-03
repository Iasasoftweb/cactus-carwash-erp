import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const permission = await prisma.permission.upsert({
    where: { code: 'POS_PRICE_OVERRIDE' },
    update: {
      name: 'Modificar precio en punto de venta',
      description: 'Permite aplicar un precio manual autorizado en el punto de venta.',
    },
    create: {
      code: 'POS_PRICE_OVERRIDE',
      name: 'Modificar precio en punto de venta',
      description: 'Permite aplicar un precio manual autorizado en el punto de venta.',
    },
  });

  const adminRole = await prisma.role.findUnique({
    where: { code: 'ADMIN' },
    select: { id: true },
  });

  if (adminRole) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(
    adminRole
      ? 'OK: POS_PRICE_OVERRIDE creado y asignado a ADMIN.'
      : 'OK: permiso creado; rol ADMIN no encontrado.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
