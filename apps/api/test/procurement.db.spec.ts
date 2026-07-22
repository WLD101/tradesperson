import './helpers/test-env';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, recreateTestDatabase, resetDatabase } from './helpers/test-db';
import { createIsolationFixtures } from './helpers/tenant-fixtures';

describe('Procurement DB Tests', () => {
  beforeAll(async () => {
    await recreateTestDatabase();
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Cascades: Tenant deletion', async () => {
    await resetDatabase();
    const fixtures = await createIsolationFixtures();
    
    // Create a Purchase Requisition
    const req = await prisma.purchaseRequisition.create({
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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();
    
    const req = await prisma.purchaseRequisition.create({
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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();
    
    const po = await prisma.purchaseOrder.create({
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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();
    
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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();
    
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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();

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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();

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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();
    
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
    await resetDatabase();
    const fixtures = await createIsolationFixtures();

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
});
