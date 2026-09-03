import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@cactus/database';
import { ERP_PERMISSIONS } from '@cactus/shared';
import type { InventoryAuditEntryResponse, InventoryCountResponse } from '@cactus/shared';
import type { AuthenticatedRequestUser } from '../auth/auth.types';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { UpdateInventoryCountItemsDto } from './dto/update-inventory-count-items.dto';

const countInclude = {
  branch: { select: { code: true, name: true } },
  items: {
    include: {
      productBranch: { include: { product: { select: { id: true, sku: true, name: true } } } },
    },
    orderBy: { productBranch: { product: { name: 'asc' as const } } },
  },
} satisfies Prisma.InventoryCountInclude;

type CountRow = Prisma.InventoryCountGetPayload<{ include: typeof countInclude }>;
const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class InventoryCountsService {
  constructor(private readonly prisma: PrismaService) {}

  private canAccessAll(user: AuthenticatedRequestUser): boolean {
    return user.branchAccessMode === 'ALL' ||
      user.permissions.includes(ERP_PERMISSIONS.companyManage) ||
      user.permissions.includes(ERP_PERMISSIONS.businessConfigurationManage);
  }

  private async assertBranch(branchId: string, user: AuthenticatedRequestUser): Promise<void> {
    if (!this.canAccessAll(user) && !user.branchIds.includes(branchId)) {
      throw new ForbiddenException('No tienes acceso a esta sucursal.');
    }
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, companyId: user.companyId, active: true }, select: { id: true } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada.');
  }

  private response(row: CountRow): InventoryCountResponse {
    const items = row.items.map((item) => ({
      id: item.id,
      productBranchId: item.productBranchId,
      productId: item.productBranch.product.id,
      productSku: item.productBranch.product.sku,
      productName: item.productBranch.product.name,
      expectedQuantity: Number(item.expectedQuantity),
      countedQuantity: item.countedQuantity === null ? null : Number(item.countedQuantity),
      differenceQuantity: item.differenceQuantity === null ? null : Number(item.differenceQuantity),
      unitCost: item.unitCost === null ? null : Number(item.unitCost),
      differenceValue: item.differenceValue === null ? null : Number(item.differenceValue),
      note: item.note,
    }));
    return {
      id: row.id, companyId: row.companyId, branchId: row.branchId,
      branchCode: row.branch.code, branchName: row.branch.name,
      reference: row.reference, status: row.status, notes: row.notes,
      createdBy: row.createdBy, confirmedBy: row.confirmedBy,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      totalItems: items.length,
      countedItems: items.filter((item) => item.countedQuantity !== null).length,
      differenceItems: items.filter((item) => (item.differenceQuantity ?? 0) !== 0).length,
      totalDifferenceValue: roundMoney(items.reduce((total, item) => total + Math.abs(item.differenceValue ?? 0), 0)),
      items,
    };
  }

  private async row(id: string, companyId: string): Promise<CountRow> {
    const row = await this.prisma.inventoryCount.findFirst({ where: { id, companyId }, include: countInclude });
    if (!row) throw new NotFoundException('Jornada de conteo no encontrada.');
    return row;
  }

  async audit(user: AuthenticatedRequestUser, branchId?: string): Promise<InventoryAuditEntryResponse[]> {
    if (branchId) await this.assertBranch(branchId, user);
    const rows = await this.prisma.inventoryMovement.findMany({
      where: {
        companyId: user.companyId,
        type: { in: ['INITIAL', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT', 'TRANSFER_IN', 'TRANSFER_OUT'] },
        ...(branchId ? { branchId } : !this.canAccessAll(user) ? { branchId: { in: user.branchIds } } : {}),
      },
      include: {
        branch: { select: { code: true, name: true } },
        product: { select: { sku: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return rows.map((row) => ({
      id: row.id, productId: row.productId, productSku: row.product.sku,
      productName: row.product.name, branchId: row.branchId,
      branchCode: row.branch.code, branchName: row.branch.name, type: row.type,
      quantity: Number(row.quantity), previousStock: Number(row.previousStock),
      newStock: Number(row.newStock), unitCost: row.unitCost === null ? null : Number(row.unitCost),
      movementValue: row.movementValue === null ? null : Number(row.movementValue),
      referenceNumber: row.referenceNumber, referenceType: row.referenceType,
      note: row.note, createdBy: row.createdBy, createdAt: row.createdAt.toISOString(),
    }));
  }

  async list(user: AuthenticatedRequestUser, branchId?: string): Promise<InventoryCountResponse[]> {
    if (branchId) await this.assertBranch(branchId, user);
    const rows = await this.prisma.inventoryCount.findMany({
      where: {
        companyId: user.companyId,
        ...(branchId ? { branchId } : !this.canAccessAll(user) ? { branchId: { in: user.branchIds } } : {}),
      },
      include: countInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.response(row));
  }

  async detail(id: string, user: AuthenticatedRequestUser): Promise<InventoryCountResponse> {
    const row = await this.row(id, user.companyId);
    await this.assertBranch(row.branchId, user);
    return this.response(row);
  }

  async create(dto: CreateInventoryCountDto, user: AuthenticatedRequestUser, ipAddress: string | null): Promise<InventoryCountResponse> {
    await this.assertBranch(dto.branchId, user);
    const open = await this.prisma.inventoryCount.findFirst({ where: { companyId: user.companyId, branchId: dto.branchId, status: 'DRAFT' }, select: { reference: true } });
    if (open) throw new BadRequestException(`Ya existe una jornada en borrador: ${open.reference}.`);

    const products = await this.prisma.productBranch.findMany({
      where: { companyId: user.companyId, branchId: dto.branchId, active: true, trackInventory: true, product: { active: true }, pointOfSales: { some: { active: true } } },
      select: { id: true, stockQuantity: true, unitCost: true },
      orderBy: { product: { name: 'asc' } },
    });
    if (!products.length) throw new BadRequestException('Esta sucursal no tiene productos activos que controlen inventario.');
    const reference = `CNT-${Date.now()}`;
    const created = await this.prisma.$transaction(async (tx) => {
      const count = await tx.inventoryCount.create({
        data: {
          companyId: user.companyId, branchId: dto.branchId, reference,
          notes: dto.notes?.trim() || null, createdBy: user.username,
          items: { create: products.map((product) => ({ productBranchId: product.id, expectedQuantity: product.stockQuantity, unitCost: product.unitCost })) },
        },
        include: countInclude,
      });
      await tx.auditLog.create({ data: { companyId: user.companyId, userId: user.id, action: 'CREATE_INVENTORY_COUNT', entityType: 'INVENTORY_COUNT', entityId: count.id, reason: count.notes, newValues: { reference, branchId: dto.branchId, items: products.length }, ipAddress } });
      return count;
    });
    return this.response(created);
  }

  async updateItems(id: string, dto: UpdateInventoryCountItemsDto, user: AuthenticatedRequestUser): Promise<InventoryCountResponse> {
    const count = await this.row(id, user.companyId);
    await this.assertBranch(count.branchId, user);
    if (count.status !== 'DRAFT') throw new BadRequestException('Solo pueden editarse jornadas en borrador.');
    const validIds = new Set(count.items.map((item) => item.productBranchId));
    const receivedIds = new Set<string>();
    for (const item of dto.items) {
      if (!validIds.has(item.productBranchId)) throw new BadRequestException('Uno de los productos no pertenece a esta jornada.');
      if (receivedIds.has(item.productBranchId)) throw new BadRequestException('El producto está repetido en la captura.');
      receivedIds.add(item.productBranchId);
    }
    await this.prisma.$transaction(dto.items.map((item) => this.prisma.inventoryCountItem.update({
      where: { inventoryCountId_productBranchId: { inventoryCountId: id, productBranchId: item.productBranchId } },
      data: { countedQuantity: item.countedQuantity, note: item.note?.trim() || null },
    })));
    return this.detail(id, user);
  }

  async confirm(id: string, user: AuthenticatedRequestUser, ipAddress: string | null): Promise<InventoryCountResponse> {
    const initial = await this.row(id, user.companyId);
    await this.assertBranch(initial.branchId, user);
    if (initial.status !== 'DRAFT') throw new BadRequestException('La jornada ya fue procesada.');

    await this.prisma.$transaction(async (tx) => {
      const lockedCount = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM inventory_counts WHERE id = ${id} AND company_id = ${user.companyId} FOR UPDATE
      `;
      if (!lockedCount.length) throw new NotFoundException('Jornada de conteo no encontrada.');
      const count = await tx.inventoryCount.findUniqueOrThrow({ where: { id }, include: countInclude });
      if (count.status !== 'DRAFT') throw new BadRequestException('La jornada ya fue procesada.');
      if (count.items.some((item) => item.countedQuantity === null)) throw new BadRequestException('Debes registrar la cantidad física de todos los productos.');

      for (const item of count.items) {
        await tx.$queryRaw`SELECT id FROM product_branches WHERE id = ${item.productBranchId} AND company_id = ${user.companyId} FOR UPDATE`;
        const productBranch = await tx.productBranch.findUniqueOrThrow({
          where: { id: item.productBranchId },
          include: { product: true, pointOfSales: { where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
        });
        const currentStock = Number(productBranch.stockQuantity);
        const expected = Number(item.expectedQuantity);
        if (currentStock !== expected) {
          throw new BadRequestException(`La existencia de ${productBranch.product.name} cambió de ${expected} a ${currentStock} durante el conteo. Cancela esta jornada y crea una nueva.`);
        }
        const counted = Number(item.countedQuantity);
        const difference = counted - currentStock;
        if (difference !== 0 && !item.note?.trim()) {
          throw new BadRequestException(
            `Debes indicar la razón de la diferencia de ${productBranch.product.name}.`,
          );
        }
        const unitCost = productBranch.unitCost === null ? null : Number(productBranch.unitCost);
        const differenceValue = unitCost === null ? null : roundMoney(difference * unitCost);
        await tx.inventoryCountItem.update({ where: { id: item.id }, data: { differenceQuantity: difference, unitCost: productBranch.unitCost, differenceValue } });
        if (difference === 0) continue;
        const pointOfSaleId = productBranch.pointOfSales[0]?.pointOfSaleId;
        if (!pointOfSaleId) throw new BadRequestException(`${productBranch.product.name} no tiene un punto de venta activo.`);
        await tx.productBranch.update({ where: { id: productBranch.id }, data: { stockQuantity: counted } });
        if (productBranch.product.branchId === count.branchId) {
          await tx.product.update({ where: { id: productBranch.productId }, data: { stockQuantity: counted } });
        }
        await tx.inventoryMovement.create({ data: {
          companyId: user.companyId, branchId: count.branchId, pointOfSaleId,
          productId: productBranch.productId,
          type: difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: Math.abs(difference), previousStock: currentStock, newStock: counted,
          unitCost: productBranch.unitCost,
          movementValue: unitCost === null ? null : roundMoney(Math.abs(difference) * unitCost),
          referenceType: 'INVENTORY_COUNT', referenceId: count.id,
          referenceNumber: count.reference,
          note: item.note || `Ajuste por conteo físico ${count.reference}.`,
          createdBy: user.username,
        } });
      }
      await tx.inventoryCount.update({ where: { id }, data: { status: 'CONFIRMED', confirmedBy: user.username, confirmedAt: new Date() } });
      await tx.auditLog.create({ data: { companyId: user.companyId, userId: user.id, action: 'CONFIRM_INVENTORY_COUNT', entityType: 'INVENTORY_COUNT', entityId: id, reason: count.notes, newValues: { reference: count.reference, branchId: count.branchId, items: count.items.length }, ipAddress } });
    });
    return this.detail(id, user);
  }

  async cancel(id: string, user: AuthenticatedRequestUser, ipAddress: string | null): Promise<InventoryCountResponse> {
    const count = await this.row(id, user.companyId);
    await this.assertBranch(count.branchId, user);
    if (count.status !== 'DRAFT') throw new BadRequestException('Solo puede cancelarse una jornada en borrador.');
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryCount.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      await tx.auditLog.create({ data: { companyId: user.companyId, userId: user.id, action: 'CANCEL_INVENTORY_COUNT', entityType: 'INVENTORY_COUNT', entityId: id, reason: count.notes, oldValues: { status: 'DRAFT' }, newValues: { status: 'CANCELLED' }, ipAddress } });
    });
    return this.detail(id, user);
  }
}
