import { BadRequestException } from "@nestjs/common";
import { Prisma, PurchaseOrderStatus, PurchaseOrderVersionStatus, PurchaseRequisitionStatus } from "@prisma/client/index";

export function assertRequisitionMutable(status: PurchaseRequisitionStatus) {
  if (status !== PurchaseRequisitionStatus.DRAFT) {
    throw new BadRequestException("Only draft requisitions can be edited.");
  }
}

export function assertRequisitionTransition(
  current: PurchaseRequisitionStatus,
  next: PurchaseRequisitionStatus,
) {
  const transitions: Record<PurchaseRequisitionStatus, PurchaseRequisitionStatus[]> = {
    DRAFT: [PurchaseRequisitionStatus.SUBMITTED, PurchaseRequisitionStatus.CANCELLED],
    SUBMITTED: [
      PurchaseRequisitionStatus.APPROVED,
      PurchaseRequisitionStatus.REJECTED,
      PurchaseRequisitionStatus.CANCELLED,
    ],
    APPROVED: [PurchaseRequisitionStatus.PARTIALLY_ORDERED, PurchaseRequisitionStatus.ORDERED],
    REJECTED: [],
    PARTIALLY_ORDERED: [PurchaseRequisitionStatus.ORDERED],
    ORDERED: [],
    CANCELLED: [],
  };
  if (!transitions[current]?.includes(next)) {
    throw new BadRequestException(`Cannot transition requisition from ${current} to ${next}.`);
  }
}

export function assertPurchaseOrderTransition(
  current: PurchaseOrderStatus,
  next: PurchaseOrderStatus,
) {
  const transitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
    DRAFT: [PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.CANCELLED],
    PENDING_APPROVAL: [
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.REJECTED,
      PurchaseOrderStatus.CANCELLED,
    ],
    APPROVED: [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.CANCELLED],
    ISSUED: [PurchaseOrderStatus.ACKNOWLEDGED, PurchaseOrderStatus.CANCELLED],
    ACKNOWLEDGED: [PurchaseOrderStatus.CANCELLED],
    PARTIALLY_FULFILLED: [],
    FULFILLED: [],
    CANCELLED: [],
    REJECTED: [],
  };
  if (!transitions[current]?.includes(next)) {
    throw new BadRequestException(`Cannot transition purchase order from ${current} to ${next}.`);
  }
}

export function assertPurchaseOrderVersionTransition(
  current: PurchaseOrderVersionStatus,
  next: PurchaseOrderVersionStatus,
) {
  const transitions: Record<
    PurchaseOrderVersionStatus,
    PurchaseOrderVersionStatus[]
  > = {
    DRAFT: [PurchaseOrderVersionStatus.PENDING_APPROVAL, PurchaseOrderVersionStatus.CANCELLED],
    PENDING_APPROVAL: [
      PurchaseOrderVersionStatus.APPROVED,
      PurchaseOrderVersionStatus.REJECTED,
      PurchaseOrderVersionStatus.CANCELLED,
    ],
    APPROVED: [PurchaseOrderVersionStatus.ISSUED],
    ISSUED: [],
    REJECTED: [],
    CANCELLED: [],
  };
  if (!transitions[current]?.includes(next)) {
    throw new BadRequestException(
      `Cannot transition purchase-order version from ${current} to ${next}.`,
    );
  }
}

export function calculateOrderLine(
  quantity: Prisma.Decimal,
  unitCost: Prisma.Decimal,
  taxRate: Prisma.Decimal,
) {
  if (quantity.lessThan(0) || unitCost.lessThan(0) || taxRate.lessThan(0)) {
    throw new BadRequestException("Money calculations cannot involve negative values.");
  }
  const lineSubtotal = quantity.mul(unitCost);
  const taxAmount = lineSubtotal.mul(taxRate);
  const lineTotal = lineSubtotal.plus(taxAmount);
  return { lineSubtotal, taxAmount, lineTotal };
}

export function summarizeOrder(
  lines: Array<{ lineSubtotal: Prisma.Decimal; taxAmount: Prisma.Decimal; lineTotal: Prisma.Decimal }>,
  deliveryAmount: Prisma.Decimal,
) {
  if (deliveryAmount.lessThan(0)) {
    throw new BadRequestException("Money calculations cannot involve negative values.");
  }
  const subtotal = lines.reduce(
    (sum, line) => sum.plus(line.lineSubtotal),
    new Prisma.Decimal(0),
  );
  const taxAmount = lines.reduce(
    (sum, line) => sum.plus(line.taxAmount),
    new Prisma.Decimal(0),
  );
  return {
    subtotal,
    taxAmount,
    deliveryAmount,
    total: subtotal.plus(taxAmount).plus(deliveryAmount),
  };
}
