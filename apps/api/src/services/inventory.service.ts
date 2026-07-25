import { Injectable } from "@nestjs/common";
import {
  InventoryMovementCondition,
  InventoryMovementType,
  Prisma,
} from "@prisma/client/index";
import { AuditService } from "./audit.service";
import { BranchAccessService } from "./branch-access.service";
import { PrismaService } from "./prisma.service";
import { TenantAccessService } from "./tenant-access.service";

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
    private readonly audit: AuditService,
  ) {}

  async reconcileStockBalances(session: TenantSession, input: { apply?: boolean } = {}) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const balances = await this.prisma.client.stockBalance.findMany({
      where: {
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        product: { select: { id: true, sku: true, name: true } },
        productVariant: { select: { id: true, sku: true, name: true } },
        supplierProduct: { select: { id: true, supplierSku: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    const rows = [];
    for (const balance of balances) {
      const movements = await this.prisma.client.inventoryMovement.findMany({
        where: {
          tenantId,
          stockBalanceId: balance.id,
        },
        select: { type: true, condition: true, quantity: true },
      });

      let expectedOnHand = new Prisma.Decimal(0);
      let expectedIssued = new Prisma.Decimal(0);
      for (const movement of movements) {
        const quantity = new Prisma.Decimal(movement.quantity);
        if (
          (movement.type === InventoryMovementType.GOODS_RECEIPT ||
            movement.type === InventoryMovementType.ADJUSTMENT) &&
          movement.condition === InventoryMovementCondition.USABLE
        ) {
          expectedOnHand = expectedOnHand.plus(quantity);
        }
        if (movement.type === InventoryMovementType.MATERIAL_ISSUE) {
          expectedOnHand = expectedOnHand.minus(quantity);
          expectedIssued = expectedIssued.plus(quantity);
        }
        if (movement.type === InventoryMovementType.MATERIAL_RETURN) {
          if (movement.condition === InventoryMovementCondition.USABLE) {
            expectedOnHand = expectedOnHand.plus(quantity);
          }
          expectedIssued = expectedIssued.minus(quantity);
        }
      }

      const onHandQuantity = new Prisma.Decimal(balance.onHandQuantity);
      const issuedQuantity = new Prisma.Decimal(balance.issuedQuantity);
      const matches =
        onHandQuantity.equals(expectedOnHand) && issuedQuantity.equals(expectedIssued);

      rows.push({
        stockBalanceId: balance.id,
        branchId: balance.branchId,
        warehouse: balance.warehouse,
        product: balance.product,
        productVariant: balance.productVariant,
        supplierProduct: balance.supplierProduct,
        unit: balance.unit,
        onHandQuantity,
        expectedOnHandQuantity: expectedOnHand,
        issuedQuantity,
        expectedIssuedQuantity: expectedIssued,
        reservedQuantity: balance.reservedQuantity,
        movementCount: movements.length,
        matches,
      });
    }

    const mismatches = rows.filter((row) => !row.matches);
    if (input.apply && mismatches.length > 0) {
      await this.prisma.client.$transaction(
        mismatches.map((row) =>
          this.prisma.client.stockBalance.update({
            where: { id: row.stockBalanceId },
            data: {
              onHandQuantity: row.expectedOnHandQuantity,
              issuedQuantity: row.expectedIssuedQuantity,
            },
          }),
        ),
      );
      await this.audit.record({
        tenantId,
        actorUserId: session.user.id,
        action: "inventory:stock-balance:reconcile",
        entityType: "stockBalance",
        newValues: {
          reconciledCount: mismatches.length,
          stockBalanceIds: mismatches.map((row) => row.stockBalanceId),
        },
      });
    }

    return {
      apply: Boolean(input.apply),
      total: rows.length,
      mismatchCount: mismatches.length,
      rows,
    };
  }
}
