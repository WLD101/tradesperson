import './helpers/test-env';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { disconnectDatabase, prisma, recreateTestDatabase, resetDatabase } from './helpers/test-db';
import { createIsolationFixtures, type IsolationFixtureSet } from './helpers/tenant-fixtures';
import { AuditService } from '../src/services/audit.service';
import { AuthorizationService } from '../src/services/authorization.service';
import { BranchAccessService } from '../src/services/branch-access.service';
import { InventoryService } from '../src/services/inventory.service';
import { ProcurementService } from '../src/services/procurement.service';
import { TenantAccessService } from '../src/services/tenant-access.service';
import type { SessionContext } from '@tradesperson/types';

describe.sequential('Procurement DB Tests', () => {
  let fixtures: IsolationFixtureSet;
  let procurement: ProcurementService;
  let inventory: InventoryService;
  let ownerSession: SessionContext;

  beforeAll(async () => {
    await recreateTestDatabase();
  }, 60000);

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await createIsolationFixtures();
    const prismaService = { client: prisma };
    const tenantAccess = new TenantAccessService();
    const branchAccess = new BranchAccessService(prismaService as never, tenantAccess);
    const audit = new AuditService(prismaService as never);
    procurement = new ProcurementService(
      prismaService as never,
      tenantAccess,
      branchAccess,
      new AuthorizationService(),
      audit,
    );
    inventory = new InventoryService(prismaService as never, tenantAccess, branchAccess, audit);
    ownerSession = {
      sessionId: 'receipt-test-session',
      user: {
        id: fixtures.ownerA.user.id,
        email: fixtures.ownerA.user.email,
        firstName: fixtures.ownerA.user.firstName,
        lastName: fixtures.ownerA.user.lastName,
        status: fixtures.ownerA.user.status,
      },
      activeTenantId: fixtures.tenantA.id,
      activeBranchId: fixtures.branchA1.id,
      memberships: [
        {
          id: fixtures.ownerA.id,
          tenantId: fixtures.tenantA.id,
          tenantName: fixtures.tenantA.name,
          tenantSlug: fixtures.tenantA.slug,
          status: 'ACTIVE',
          isOwner: true,
          roleKeys: ['BUSINESS_OWNER'],
          permissions: [],
          defaultBranchId: fixtures.branchA1.id,
        },
      ],
    };
  }, 20000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('Cascades: Tenant deletion', async () => {
    // Create a Purchase Requisition
    await prisma.purchaseRequisition.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        requisitionNumber: 'REQ-DEL-1',
        status: 'DRAFT',
      }
    });

    // Delete tenant
    await expect(prisma.tenant.delete({ where: { id: fixtures.tenantA.id } }))
      .rejects.toThrow(/Foreign key constraint failed|Foreign key constraint violated/);
  });
  
  it('Cascades: Branch deletion', async () => {
    await prisma.purchaseRequisition.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        requisitionNumber: 'REQ-DEL-2',
        status: 'DRAFT',
      }
    });

    // Delete branch
    await expect(prisma.branch.delete({ where: { id: fixtures.branchA1.id } }))
      .rejects.toThrow(/Foreign key constraint failed|Foreign key constraint violated/);
  });
  
  it('Cascades: Supplier deletion', async () => {
    await prisma.purchaseOrder.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        supplierId: fixtures.supplierA.id,
        purchaseOrderNumber: 'PO-DEL-1',
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    });

    // Delete supplier
    await expect(prisma.supplier.delete({ where: { id: fixtures.supplierA.id } }))
      .rejects.toThrow(/Foreign key constraint failed|Foreign key constraint violated/);
  });
  
  it('Cascades: Product deletion', async () => {
    const req = await prisma.purchaseRequisition.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        requisitionNumber: 'REQ-DEL-PROD',
        status: 'DRAFT',
        lines: {
          create: [{
            tenantId: fixtures.tenantA.id,
            productId: fixtures.productA.id,
            description: 'Test',
            requestedQuantity: 1,
            unit: 'EACH',
            displayOrder: 1,
          }]
        }
      },
      include: { lines: true }
    });

    // Delete product
    await expect(prisma.product.delete({ where: { id: fixtures.productA.id } }))
      .rejects.toThrow(/Foreign key constraint failed|Foreign key constraint violated/);
  });
  
  it('Cascades: Variant deletion', async () => {
    const variant = await prisma.productVariant.create({
      data: {
        tenantId: fixtures.tenantA.id,
        productId: fixtures.productA.id,
        name: 'Var',
        sku: 'VAR-1'
      }
    });

    const req = await prisma.purchaseRequisition.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        requisitionNumber: 'REQ-DEL-VAR',
        status: 'DRAFT',
        lines: {
          create: [{
            tenantId: fixtures.tenantA.id,
            productId: fixtures.productA.id,
            productVariantId: variant.id,
            description: 'Test',
            requestedQuantity: 1,
            unit: 'EACH',
            displayOrder: 1,
          }]
        }
      },
      include: { lines: true }
    });

    // Delete variant
    await prisma.productVariant.delete({ where: { id: variant.id } });

    // Verify req line is gone
    const found = await prisma.purchaseRequisitionLine.findUnique({ where: { id: req.lines[0]?.id || '' } });
    expect(found?.productVariantId).toBeNull();
  });

  it('Constraints: Unique Tenant/PO-Number', async () => {
    await prisma.purchaseOrder.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        supplierId: fixtures.supplierA.id,
        purchaseOrderNumber: 'PO-UNIQUE-1',
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    });

    await expect(prisma.purchaseOrder.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        supplierId: fixtures.supplierA.id,
        purchaseOrderNumber: 'PO-UNIQUE-1', // duplicate
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    })).rejects.toThrow();
  });
  
  it('Constraints: Unique Tenant/PO/Version', async () => {
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        supplierId: fixtures.supplierA.id,
        purchaseOrderNumber: 'PO-UNIQUE-V1',
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    });

    await prisma.purchaseOrderVersion.create({
      data: {
        tenantId: fixtures.tenantA.id,
        purchaseOrderId: po.id,
        versionNumber: 1,
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    });

    await expect(prisma.purchaseOrderVersion.create({
      data: {
        tenantId: fixtures.tenantA.id,
        purchaseOrderId: po.id,
        versionNumber: 1, // duplicate
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    })).rejects.toThrow();
  });

  it('Concurrency: Concurrent Draft creation', async () => {
    const reqs = await Promise.all([
      prisma.purchaseRequisition.create({
        data: {
          tenantId: fixtures.tenantA.id,
          branchId: fixtures.branchA1.id,
          requisitionNumber: 'REQ-C-1',
          status: 'DRAFT',
        }
      }),
      prisma.purchaseRequisition.create({
        data: {
          tenantId: fixtures.tenantA.id,
          branchId: fixtures.branchA1.id,
          requisitionNumber: 'REQ-C-2',
          status: 'DRAFT',
        }
      })
    ]);

    expect(reqs.length).toBe(2);
  });
  
  it('Concurrency: Concurrent PO conversion', async () => {
    const po1 = prisma.purchaseOrder.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        supplierId: fixtures.supplierA.id,
        purchaseOrderNumber: 'PO-CON-1',
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    });

    const po2 = prisma.purchaseOrder.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        supplierId: fixtures.supplierA.id,
        purchaseOrderNumber: 'PO-CON-2',
        status: 'DRAFT',
        currency: 'GBP',
        total: 0,
      }
    });

    await expect(Promise.all([po1, po2])).resolves.toHaveLength(2);
  });

  it('Goods Receipts: posts partial and final receipts into immutable stock movements', async () => {
    const warehouse = await prisma.inventoryWarehouse.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        code: 'WH-GR-1',
        name: 'Goods receipt warehouse',
        isDefault: true,
      },
    });
    const order = await prisma.purchaseOrder.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        supplierId: fixtures.supplierA.id,
        purchaseOrderNumber: 'PO-GR-1',
        status: 'ISSUED',
        currency: 'GBP',
        subtotal: 100,
        taxAmount: 20,
        total: 120,
        versions: {
          create: {
            tenantId: fixtures.tenantA.id,
            versionNumber: 1,
            status: 'ISSUED',
            currency: 'GBP',
            subtotal: 100,
            taxAmount: 20,
            total: 120,
            lines: {
              create: {
                tenantId: fixtures.tenantA.id,
                productId: fixtures.productA.id,
                supplierProductId: fixtures.supplierProductA.id,
                description: 'Test carpet',
                quantity: 10,
                unit: 'SQM',
                unitCost: 10,
                lineSubtotal: 100,
                taxAmount: 20,
                lineTotal: 120,
                displayOrder: 0,
              },
            },
          },
        },
      },
      include: { versions: { include: { lines: true } } },
    });
    const line = order.versions[0]!.lines[0]!;

    const draft = await procurement.createGoodsReceipt(ownerSession, order.id, {
      warehouseId: warehouse.id,
      supplierReference: 'ASN-1',
      idempotencyKey: 'receipt-partial-1',
      lines: [{ purchaseOrderLineId: line.id, receivedQuantity: 6, damagedQuantity: 1 }],
    });
    const duplicate = await procurement.createGoodsReceipt(ownerSession, order.id, {
      warehouseId: warehouse.id,
      idempotencyKey: 'receipt-partial-1',
      lines: [{ purchaseOrderLineId: line.id, receivedQuantity: 1 }],
    });
    expect(duplicate.id).toBe(draft.id);

    const postedPartial = await procurement.postGoodsReceipt(ownerSession, draft.id);
    expect(postedPartial.status).toBe('POSTED');

    const balanceAfterPartial = await prisma.stockBalance.findFirstOrThrow({
      where: { tenantId: fixtures.tenantA.id, warehouseId: warehouse.id, productId: fixtures.productA.id },
    });
    expect(balanceAfterPartial.onHandQuantity.toString()).toBe('6');
    expect(await prisma.inventoryMovement.count({ where: { goodsReceiptId: draft.id } })).toBe(2);
    expect((await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })).status)
      .toBe('PARTIALLY_FULFILLED');
    await expect(
      procurement.createGoodsReceipt(ownerSession, order.id, {
        warehouseId: warehouse.id,
        idempotencyKey: 'receipt-over-1',
        lines: [{ purchaseOrderLineId: line.id, receivedQuantity: 4 }],
      }),
    ).rejects.toThrow(/cannot exceed/i);

    const finalDraft = await procurement.createGoodsReceipt(ownerSession, order.id, {
      warehouseId: warehouse.id,
      idempotencyKey: 'receipt-final-1',
      lines: [{ purchaseOrderLineId: line.id, receivedQuantity: 3 }],
    });
    await procurement.postGoodsReceipt(ownerSession, finalDraft.id);

    const balanceAfterFinal = await prisma.stockBalance.findFirstOrThrow({
      where: { tenantId: fixtures.tenantA.id, warehouseId: warehouse.id, productId: fixtures.productA.id },
    });
    expect(balanceAfterFinal.onHandQuantity.toString()).toBe('9');
    expect((await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })).status)
      .toBe('FULFILLED');
    expect((await inventory.reconcileStockBalances(ownerSession)).mismatchCount).toBe(0);

    await prisma.stockBalance.update({
      where: { id: balanceAfterFinal.id },
      data: { onHandQuantity: 123, issuedQuantity: 45 },
    });
    const mismatchReport = await inventory.reconcileStockBalances(ownerSession);
    expect(mismatchReport.mismatchCount).toBe(1);
    expect(mismatchReport.rows[0]!.expectedOnHandQuantity.toString()).toBe('9');

    await inventory.reconcileStockBalances(ownerSession, { apply: true });
    const repaired = await prisma.stockBalance.findUniqueOrThrow({ where: { id: balanceAfterFinal.id } });
    expect(repaired.onHandQuantity.toString()).toBe('9');
    expect(repaired.issuedQuantity.toString()).toBe('0');
    await expect(
      prisma.auditLog.count({
        where: { tenantId: fixtures.tenantA.id, action: { in: ['procurement:goods-receipt:create', 'procurement:goods-receipt:post'] } },
      }),
    ).resolves.toBeGreaterThanOrEqual(4);
  });
});
