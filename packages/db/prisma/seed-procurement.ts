import { PrismaClient, Tenant, Branch, User } from "@prisma/client";

export async function seedProcurement(
  prisma: PrismaClient,
  tenant: Tenant,
  branch: Branch,
  owner: User,
  manager: User
) {
  console.log("Seeding Procurement...");

  // First, find a supplier to use
  const supplier = await prisma.supplier.findFirst({
    where: { tenantId: tenant.id, supplierCode: "PFD-001" },
  });

  if (!supplier) {
    console.warn("Could not find supplier PFD-001, skipping procurement seed.");
    return;
  }

  // Find a product from this supplier
  const supplierProduct = await prisma.supplierProduct.findFirst({
    where: { tenantId: tenant.id, supplierId: supplier.id },
  });

  if (!supplierProduct) {
    console.warn("Could not find supplier product, skipping procurement seed.");
    return;
  }

  const unitName = "EACH";
  const desc = "Test product description";

  // --- REQUISITIONS ---
  
  // Draft Requisition
  await prisma.purchaseRequisition.upsert({
    where: { tenantId_requisitionNumber: { tenantId: tenant.id, requisitionNumber: "REQ-DRAFT-01" } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      requisitionNumber: "REQ-DRAFT-01",
      status: "DRAFT",
      requestedById: owner.id,
      lines: {
        create: [
          {
            tenantId: tenant.id,
            productId: supplierProduct.productId,
            productVariantId: supplierProduct.variantId,
            requestedQuantity: "10.00",
            unit: unitName,
            description: desc,
          },
        ],
      },
    },
  });

  // Submitted Requisition
  await prisma.purchaseRequisition.upsert({
    where: { tenantId_requisitionNumber: { tenantId: tenant.id, requisitionNumber: "REQ-SUB-01" } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      requisitionNumber: "REQ-SUB-01",
      status: "SUBMITTED",
      requestedById: owner.id,
      submittedAt: new Date(),
      lines: {
        create: [
          {
            tenantId: tenant.id,
            productId: supplierProduct.productId,
            productVariantId: supplierProduct.variantId,
            requestedQuantity: "5.00",
            unit: unitName,
            description: desc,
          },
        ],
      },
    },
  });

  // Approved Requisition
  await prisma.purchaseRequisition.upsert({
    where: { tenantId_requisitionNumber: { tenantId: tenant.id, requisitionNumber: "REQ-APP-01" } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      requisitionNumber: "REQ-APP-01",
      status: "APPROVED",
      requestedById: owner.id,
      submittedAt: new Date(),
      approvedById: manager.id,
      approvedAt: new Date(),
      lines: {
        create: [
          {
            tenantId: tenant.id,
            productId: supplierProduct.productId,
            productVariantId: supplierProduct.variantId,
            requestedQuantity: "20.00",
            unit: unitName,
            description: desc,
          },
        ],
      },
    },
  });

  // Fully Ordered Requisition
  const reqOrdered = await prisma.purchaseRequisition.upsert({
    where: { tenantId_requisitionNumber: { tenantId: tenant.id, requisitionNumber: "REQ-ORD-01" } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      requisitionNumber: "REQ-ORD-01",
      status: "ORDERED",
      requestedById: owner.id,
      submittedAt: new Date(),
      approvedById: manager.id,
      approvedAt: new Date(),
      lines: {
        create: [
          {
            tenantId: tenant.id,
            productId: supplierProduct.productId,
            productVariantId: supplierProduct.variantId,
            requestedQuantity: "50.00",
            orderedQuantity: "50.00",
            unit: unitName,
            description: desc,
          },
        ],
      },
    },
    include: { lines: true }
  });

  // --- PURCHASE ORDERS ---

  // Draft PO
  await prisma.purchaseOrder.upsert({
    where: { tenantId_purchaseOrderNumber: { tenantId: tenant.id, purchaseOrderNumber: "PO-DRAFT-01" } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      supplierId: supplier.id,
      purchaseOrderNumber: "PO-DRAFT-01",
      status: "DRAFT",
      currency: "GBP",
      subtotal: "100.00",
      taxAmount: "20.00",
      total: "120.00",
      createdById: owner.id,
      versions: {
        create: {
          tenantId: tenant.id,
          versionNumber: 1,
          status: "DRAFT",
          currency: "GBP",
          subtotal: "100.00",
          taxAmount: "20.00",
          total: "120.00",
          createdById: owner.id,
          lines: {
            create: [
              {
                tenantId: tenant.id,
                productId: supplierProduct.productId,
                productVariantId: supplierProduct.variantId,
                supplierProductId: supplierProduct.id,
                quantity: "10.00",
                unit: unitName,
                description: desc,
                unitCost: "10.00",
                lineSubtotal: "100.00",
                taxAmount: "20.00",
                lineTotal: "120.00",
              }
            ]
          }
        }
      }
    }
  });

  // Pending Approval PO
  await prisma.purchaseOrder.upsert({
    where: { tenantId_purchaseOrderNumber: { tenantId: tenant.id, purchaseOrderNumber: "PO-PEND-01" } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      supplierId: supplier.id,
      purchaseOrderNumber: "PO-PEND-01",
      status: "PENDING_APPROVAL",
      currency: "GBP",
      subtotal: "200.00",
      taxAmount: "40.00",
      total: "240.00",
      createdById: owner.id,
      versions: {
        create: {
          tenantId: tenant.id,
          versionNumber: 1,
          status: "PENDING_APPROVAL",
          currency: "GBP",
          subtotal: "200.00",
          taxAmount: "40.00",
          total: "240.00",
          createdById: owner.id,
          lines: {
            create: [
              {
                tenantId: tenant.id,
                productId: supplierProduct.productId,
                productVariantId: supplierProduct.variantId,
                supplierProductId: supplierProduct.id,
                quantity: "20.00",
                unit: unitName,
                description: desc,
                unitCost: "10.00",
                lineSubtotal: "200.00",
                taxAmount: "40.00",
                lineTotal: "240.00",
              }
            ]
          }
        }
      }
    }
  });

  // Issued PO linked to the Fully Ordered Requisition
  const issuedPO = await prisma.purchaseOrder.upsert({
    where: { tenantId_purchaseOrderNumber: { tenantId: tenant.id, purchaseOrderNumber: "PO-ISS-01" } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      supplierId: supplier.id,
      purchaseOrderNumber: "PO-ISS-01",
      status: "ISSUED",
      currency: "GBP",
      subtotal: "500.00",
      taxAmount: "100.00",
      total: "600.00",
      createdById: owner.id,
      issuedAt: new Date(),
      issuedById: manager.id,
      approvedAt: new Date(),
      approvedById: manager.id,
      versions: {
        create: {
          tenantId: tenant.id,
          versionNumber: 1,
          status: "ISSUED",
          currency: "GBP",
          subtotal: "500.00",
          taxAmount: "100.00",
          total: "600.00",
          createdById: owner.id,
          approvedById: manager.id,
          approvedAt: new Date(),
          lines: {
            create: [
              {
                tenantId: tenant.id,
                productId: supplierProduct.productId,
                productVariantId: supplierProduct.variantId ?? null,
                supplierProductId: supplierProduct.id,
                purchaseRequisitionLineId: reqOrdered.lines[0]?.id ?? null,
                quantity: "50.00",
                unit: unitName,
                description: desc,
                unitCost: "10.00",
                lineSubtotal: "500.00",
                taxAmount: "100.00",
                lineTotal: "600.00",
              }
            ]
          }
        }
      }
    },
    include: { versions: { include: { lines: true } } }
  });

  const issuedPOWithVersions = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: issuedPO.id },
    include: { versions: true }
  });

  // Supplier Acknowledgement
  await prisma.supplierAcknowledgement.deleteMany({
    where: {
      tenantId: tenant.id,
      purchaseOrderId: issuedPO.id,
    }
  });
  
  await prisma.supplierAcknowledgement.create({
    data: {
      tenantId: tenant.id,
      purchaseOrderId: issuedPOWithVersions.id,
      purchaseOrderVersionId: issuedPOWithVersions.versions[0]?.id ?? "",
      acknowledgedAt: new Date(),
      supplierReference: "ACK-999123",
      createdById: owner.id,
    }
  });

  // Delivery Plan
  await prisma.purchaseOrderDeliveryPlan.deleteMany({
    where: {
      tenantId: tenant.id,
      purchaseOrderId: issuedPOWithVersions.id,
    }
  });

  await prisma.purchaseOrderDeliveryPlan.create({
    data: {
      tenantId: tenant.id,
      purchaseOrderId: issuedPOWithVersions.id,
      purchaseOrderVersionId: issuedPOWithVersions.versions[0]?.id ?? "",
      expectedDate: new Date(Date.now() + 86400000 * 5),
      createdById: owner.id,
    }
  });

  console.log("Procurement seed complete.");
}
