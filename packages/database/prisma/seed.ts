import {
  CommissionType,
  PaymentMethodType,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

async function main(): Promise<void> {
  const company = await prisma.company.upsert({
    where: { id: COMPANY_ID },
    update: {},
    create: {
      id: COMPANY_ID,
      name: 'Cactus CarWash',
      currencyCode: 'DOP',
      currencySymbol: 'RD$',
    },
  });

  const branch = await prisma.branch.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'MAIN',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      code: 'MAIN',
      name: 'Sucursal Principal',
    },
  });

  const vehicleTypes = [
    ['CAR', 'Carro'],
    ['JEEP', 'Jeep'],
    ['PICKUP', 'Camioneta'],
    ['BUS', 'Bus'],
    ['MINIBUS', 'Mini Bus'],
    ['MOTORCYCLE', 'Motocicleta'],
  ] as const;

  const vehicleTypeMap = new Map<string, string>();

  for (const [code, name] of vehicleTypes) {
    const row = await prisma.vehicleType.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
    vehicleTypeMap.set(code, row.id);
  }

  const methods = [
    ['CASH', 'Efectivo', PaymentMethodType.CASH],
    ['CARD', 'Tarjeta', PaymentMethodType.CARD],
    ['TRANSFER', 'Transferencia', PaymentMethodType.TRANSFER],
    ['CREDIT', 'Crédito', PaymentMethodType.CREDIT],
  ] as const;

  for (const [code, name, type] of methods) {
    await prisma.paymentMethod.upsert({
      where: { code },
      update: { name, type },
      create: { code, name, type },
    });
  }


  const operationalAreaDefinitions = [
    ['LAV', 'Lavado', 'LAV', '#1f5c3f', 'droplets', 25],
    ['TAL', 'Taller', 'TAL', '#345f9d', 'wrench', 90],
  ] as const;

  const operationalAreaMap = new Map<string, string>();

  for (const [code, name, ticketPrefix, color, icon, slaMinutes] of operationalAreaDefinitions) {
    const area = await prisma.operationalArea.upsert({
      where: {
        branchId_code: {
          branchId: branch.id,
          code,
        },
      },
      update: {
        name,
        ticketPrefix,
        color,
        icon,
        slaMinutes,
        autoPrint: true,
        printCopies: 1,
      },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code,
        name,
        ticketPrefix,
        color,
        icon,
        slaMinutes,
        autoPrint: true,
        printCopies: 1,
      },
    });

    operationalAreaMap.set(code, area.id);
  }

  const categories = [
    ['WASH', 'Lavado'],
    ['WORKSHOP', 'Taller'],
  ] as const;

  const categoryMap = new Map<string, string>();

  for (const [code, name] of categories) {
    const row = await prisma.serviceCategory.upsert({
      where: {
        companyId_code: {
          companyId: companyId,
          code,
        },
      },
      update: {
        name,
        branchId: branchId,
        operationalAreaId: operationalAreaMap.get(code === 'WASH' ? 'LAV' : 'TAL'),
      },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code,
        name,
        operationalAreaId: operationalAreaMap.get(code === 'WASH' ? 'LAV' : 'TAL'),
      },
    });
    categoryMap.set(code, row.id);
  }

  const serviceDefinitions = [
    ['WASH_BASIC', 'Lavado básico', 'WASH', { CAR: 300, JEEP: 400, PICKUP: 400, BUS: 800, MINIBUS: 500, MOTORCYCLE: 200 }],
    ['WASH_SPECIAL', 'Lavado especial', 'WASH', { CAR: 350, JEEP: 500, PICKUP: 500, BUS: 900, MINIBUS: 600, MOTORCYCLE: 250 }],
    ['ENGINE_WASH', 'Lavado de motor', 'WORKSHOP', { CAR: 400, JEEP: 500, PICKUP: 500, BUS: 800, MINIBUS: 600, MOTORCYCLE: 300 }],
    ['GREASING', 'Engrase', 'WORKSHOP', { CAR: 400, JEEP: 500, PICKUP: 500, BUS: 800, MINIBUS: 600, MOTORCYCLE: 250 }],
    ['BLOWING', 'Sopleteo', 'WORKSHOP', { CAR: 400, JEEP: 500, PICKUP: 500, BUS: 800, MINIBUS: 600, MOTORCYCLE: 250 }],
    ['OIL_CHANGE', 'Cambio de aceite', 'WORKSHOP', { CAR: 500, JEEP: 600, PICKUP: 600, BUS: 900, MINIBUS: 700, MOTORCYCLE: 350 }],
  ] as const;

  const serviceIds: string[] = [];

  for (const [code, name, categoryCode, prices] of serviceDefinitions) {
    const service = await prisma.service.upsert({
      where: {
        companyId_code: {
          companyId: companyId,
          code,
        },
      },
      update: {
        name,
        categoryId: categoryMap.get(categoryCode)!,
      },
      create: {
        companyId: companyId,
        code,
        name,
        categoryId: categoryMap.get(categoryCode)!,
      },
    });

    serviceIds.push(service.id);

    for (const [vehicleCode, amount] of Object.entries(prices)) {
      const vehicleTypeId = vehicleTypeMap.get(vehicleCode);
      if (!vehicleTypeId) continue;

      const existing = await prisma.servicePrice.findFirst({
        where: {
          serviceId: service.id,
          vehicleTypeId,
          branchId: branchId,
          active: true,
        },
      });

      if (!existing) {
        await prisma.servicePrice.create({
          data: {
            serviceId: service.id,
            vehicleTypeId,
            branchId: branchId,
            price: amount,
            taxable: false,
          },
        });
      }
    }
  }

  const employeeDefinitions = [
    ['EMP-001', 'Juan Pérez', 'Lavador', false],
    ['EMP-002', 'Pedro Gómez', 'Mecánico', false],
    ['EMP-003', 'Carlos Díaz', 'Cajero', true],
    ['EMP-004', 'Luis Martínez', 'Cajero', true],
  ] as const;

  for (const [
    employeeNo,
    fullName,
    jobPosition,
    canOperateCash,
  ] of employeeDefinitions) {
    const employee = await prisma.employee.upsert({
      where: {
        companyId_employeeNo: {
          companyId: companyId,
          employeeNo,
        },
      },
      update: {
        fullName,
        branchId: branchId,
        jobPosition,
        canOperateCash,
      },
      create: {
        companyId: companyId,
        branchId: branchId,
        employeeNo,
        fullName,
        jobPosition,
        canOperateCash,
      },
    });

    for (const serviceId of serviceIds) {
      const existingRule = await prisma.employeeCommissionRule.findFirst({
        where: {
          employeeId: employee.id,
          serviceId,
          active: true,
        },
      });

      if (!existingRule) {
        await prisma.employeeCommissionRule.create({
          data: {
            employeeId: employee.id,
            serviceId,
            type: CommissionType.PERCENTAGE,
            value: 15,
          },
        });
      }
    }
  }

  await prisma.numberSequence.upsert({
    where: {
      branchId_documentType: {
        branchId: branchId,
        documentType: 'SERVICE_ORDER',
      },
    },
    update: {},
    create: {
      companyId: companyId,
      branchId: branchId,
      documentType: 'SERVICE_ORDER',
      prefix: 'ORD',
      currentValue: 0,
      padding: 8,
    },
  });
  await seedPosFoundation(company.id, branch.id);
}

