import './helpers/test-env';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { disconnectDatabase, prisma, recreateTestDatabase, resetDatabase } from './helpers/test-db';
import { createIsolationFixtures, type IsolationFixtureSet } from './helpers/tenant-fixtures';
import { AuditService } from '../src/services/audit.service';
import { AuthorizationService } from '../src/services/authorization.service';
import { BranchAccessService } from '../src/services/branch-access.service';
import { InventoryService } from '../src/services/inventory.service';
import { JobsService } from '../src/services/jobs.service';
import { ProcurementService } from '../src/services/procurement.service';
import { TenantAccessService } from '../src/services/tenant-access.service';
import type { SessionContext } from '@tradesperson/types';

describe.sequential('Procurement DB Tests', () => {
  let fixtures: IsolationFixtureSet;
  let procurement: ProcurementService;
  let inventory: InventoryService;
  let jobs: JobsService;
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
    jobs = new JobsService(prismaService as never, tenantAccess, branchAccess, audit);
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
  }, 40000);

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

  it('Job Returns: records usable and damaged returns against issued material', async () => {
    const warehouse = await prisma.inventoryWarehouse.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        code: 'WH-RETURN-1',
        name: 'Return warehouse',
      },
    });
    const job = await prisma.job.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        customerId: fixtures.customerA1.id,
        siteId: fixtures.siteA1.id,
        jobNumber: 'JOB-RETURN-1',
        status: 'IN_PROGRESS',
      },
    });
    const requirement = await prisma.materialRequirement.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        jobId: job.id,
        productId: fixtures.productA.id,
        supplierProductId: fixtures.supplierProductA.id,
        status: 'ISSUED',
        description: 'Issued carpet',
        requiredQuantity: 5,
        allocatedQuantity: 5,
        issuedQuantity: 5,
        unit: 'SQM',
      },
    });
    const balance = await prisma.stockBalance.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        warehouseId: warehouse.id,
        productId: fixtures.productA.id,
        supplierProductId: fixtures.supplierProductA.id,
        unit: 'SQM',
        onHandQuantity: 5,
        issuedQuantity: 5,
      },
    });
    const reservation = await prisma.stockReservation.create({
      data: {
        tenantId: fixtures.tenantA.id,
        branchId: fixtures.branchA1.id,
        warehouseId: warehouse.id,
        stockBalanceId: balance.id,
        jobId: job.id,
        materialRequirementId: requirement.id,
        productId: fixtures.productA.id,
        supplierProductId: fixtures.supplierProductA.id,
        status: 'ISSUED',
        reservedQuantity: 5,
        issuedQuantity: 5,
        unit: 'SQM',
      },
    });
    await prisma.inventoryMovement.createMany({
      data: [
        {
          tenantId: fixtures.tenantA.id,
          branchId: fixtures.branchA1.id,
          warehouseId: warehouse.id,
          stockBalanceId: balance.id,
          productId: fixtures.productA.id,
          supplierProductId: fixtures.supplierProductA.id,
          type: 'GOODS_RECEIPT',
          condition: 'USABLE',
          quantity: 10,
          unit: 'SQM',
        },
        {
          tenantId: fixtures.tenantA.id,
          branchId: fixtures.branchA1.id,
          warehouseId: warehouse.id,
          stockBalanceId: balance.id,
          productId: fixtures.productA.id,
          supplierProductId: fixtures.supplierProductA.id,
          jobId: job.id,
          materialRequirementId: requirement.id,
          type: 'MATERIAL_ISSUE',
          condition: 'USABLE',
          quantity: 5,
          unit: 'SQM',
          sourceType: 'stock-reservation',
          sourceId: reservation.id,
          idempotencyKey: `${reservation.id}:issue`,
        },
      ],
    });

    await jobs.returnJobStock(ownerSession, job.id, {
      idempotencyKey: 'return-1',
      lines: [{ stockReservationId: reservation.id, usableQuantity: 2, damagedQuantity: 1 }],
    });

    const updatedBalance = await prisma.stockBalance.findUniqueOrThrow({ where: { id: balance.id } });
    expect(updatedBalance.onHandQuantity.toString()).toBe('7');
    expect(updatedBalance.issuedQuantity.toString()).toBe('2');
    expect(await prisma.inventoryMovement.count({ where: { type: 'MATERIAL_RETURN', jobId: job.id } })).toBe(2);
    expect((await prisma.materialRequirement.findUniqueOrThrow({ where: { id: requirement.id } })).issuedQuantity.toString()).toBe('2');
    expect((await inventory.reconcileStockBalances(ownerSession)).mismatchCount).toBe(0);
    await expect(
      jobs.returnJobStock(ownerSession, job.id, {
        idempotencyKey: 'return-over-1',
        lines: [{ stockReservationId: reservation.id, usableQuantity: 3 }],
      }),
    ).rejects.toThrow(/cannot exceed/i);
  });

  it('Scheduling: retrieves date-range jobs and enforces installer workload rules', async () => {
    const createJob = (jobNumber: string, branchId = fixtures.branchA1.id) =>
      prisma.job.create({
        data: {
          tenantId: fixtures.tenantA.id,
          branchId,
          customerId: branchId === fixtures.branchA2.id ? fixtures.customerA2.id : fixtures.customerA1.id,
          siteId: branchId === fixtures.branchA2.id ? fixtures.siteA2.id : fixtures.siteA1.id,
          jobNumber,
          status: 'DRAFT',
          title: `${jobNumber} scheduling test`,
          totalValue: 1000,
        },
      });
    const start = new Date('2026-08-03T09:00:00.000Z');
    const end = new Date('2026-08-03T12:00:00.000Z');
    const overlappingStart = new Date('2026-08-03T10:00:00.000Z');
    const overlappingEnd = new Date('2026-08-03T11:00:00.000Z');
    const laterStart = new Date('2026-08-03T13:00:00.000Z');
    const laterEnd = new Date('2026-08-03T15:00:00.000Z');
    const rangeEnd = new Date('2026-08-10T00:00:00.000Z');

    const [firstJob, secondJob, thirdJob, branchTwoJob] = await Promise.all([
      createJob('JOB-SCH-1'),
      createJob('JOB-SCH-2'),
      createJob('JOB-SCH-3'),
      createJob('JOB-SCH-B2', fixtures.branchA2.id),
    ]);

    await jobs.scheduleJob(ownerSession, firstJob.id, {
      scheduledStart: start,
      scheduledEnd: end,
      assignedInstallerId: fixtures.branchUserA1.user.id,
      installationTeamName: 'Team Schedule A',
    });

    await expect(
      jobs.scheduleJob(ownerSession, secondJob.id, {
        scheduledStart: overlappingStart,
        scheduledEnd: overlappingEnd,
        assignedInstallerId: fixtures.branchUserA1.user.id,
        installationTeamName: 'Team Schedule B',
      }),
    ).rejects.toThrow(/overlaps JOB-SCH-1/i);

    await expect(
      jobs.scheduleJob(ownerSession, secondJob.id, {
        scheduledStart: laterStart,
        scheduledEnd: laterEnd,
        assignedInstallerId: fixtures.ownerB.user.id,
      }),
    ).rejects.toThrow(/active member of this tenant/i);

    await jobs.scheduleJob(ownerSession, secondJob.id, {
      scheduledStart: laterStart,
      scheduledEnd: laterEnd,
      assignedInstallerId: fixtures.branchUserA1.user.id,
      installationTeamName: 'Team Schedule B',
    });

    await jobs.scheduleJob(ownerSession, thirdJob.id, {
      scheduledStart: overlappingStart,
      scheduledEnd: overlappingEnd,
      assignedInstallerId: fixtures.staffA.user.id,
      installationTeamName: 'Team Schedule C',
    });

    await expect(
      jobs.scheduleJob(ownerSession, thirdJob.id, {
        scheduledStart: overlappingStart,
        scheduledEnd: overlappingEnd,
        assignedInstallerId: fixtures.staffA.user.id,
        installationTeamName: 'Team Schedule C',
      }),
    ).resolves.toMatchObject({ id: thirdJob.id, status: 'SCHEDULED' });

    const schedule = await jobs.listSchedule(ownerSession, {
      start,
      end: rangeEnd,
      branchId: fixtures.branchA1.id,
      unscheduledLimit: 10,
    });
    expect(schedule.scheduledJobs.map((job: any) => job.jobNumber)).toEqual(
      expect.arrayContaining(['JOB-SCH-1', 'JOB-SCH-2', 'JOB-SCH-3']),
    );
    expect(schedule.unscheduledJobs.map((job: any) => job.jobNumber)).not.toContain('JOB-SCH-B2');

    await jobs.unscheduleJob(ownerSession, secondJob.id);
    const unscheduled = await prisma.job.findUniqueOrThrow({ where: { id: secondJob.id } });
    expect(unscheduled.scheduledStart).toBeNull();
    expect(unscheduled.assignedInstallerId).toBeNull();
    expect(unscheduled.status).toBe('DRAFT');

    const branchRestrictedSession: SessionContext = {
      ...ownerSession,
      user: {
        id: fixtures.branchUserA1.user.id,
        email: fixtures.branchUserA1.user.email,
        firstName: fixtures.branchUserA1.user.firstName,
        lastName: fixtures.branchUserA1.user.lastName,
        status: fixtures.branchUserA1.user.status,
      },
      activeBranchId: fixtures.branchA1.id,
      memberships: [
        {
          id: fixtures.branchUserA1.id,
          tenantId: fixtures.tenantA.id,
          tenantName: fixtures.tenantA.name,
          tenantSlug: fixtures.tenantA.slug,
          status: 'ACTIVE',
          isOwner: false,
          roleKeys: ['BRANCH_MANAGER'],
          permissions: [],
          defaultBranchId: fixtures.branchA1.id,
        },
      ],
    };
    await expect(
      jobs.scheduleJob(branchRestrictedSession, branchTwoJob.id, {
        scheduledStart: start,
        scheduledEnd: end,
        assignedInstallerId: fixtures.branchUserA1.user.id,
      }),
    ).rejects.toThrow(/not found/i);
  });
});
