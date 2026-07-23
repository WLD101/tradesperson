import { BadRequestException } from "@nestjs/common";
import { EstimateLineType, EstimateStatus, Prisma } from "@prisma/client/index";

export function assertEstimateMutable(status: EstimateStatus) {
  if (status !== EstimateStatus.DRAFT && status !== EstimateStatus.CALCULATED) {
    throw new BadRequestException("Only draft or calculated estimates can be edited.");
  }
}

export function assertEstimateTransition(current: EstimateStatus, next: EstimateStatus) {
  const transitions: Record<EstimateStatus, EstimateStatus[]> = {
    DRAFT: [EstimateStatus.CALCULATED, EstimateStatus.CANCELLED],
    CALCULATED: [
      EstimateStatus.READY_FOR_QUOTE,
      EstimateStatus.CANCELLED,
      EstimateStatus.DRAFT,
    ],
    READY_FOR_QUOTE: [EstimateStatus.QUOTED, EstimateStatus.CANCELLED],
    QUOTED: [EstimateStatus.ACCEPTED, EstimateStatus.REJECTED, EstimateStatus.CANCELLED],
    ACCEPTED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  if (!transitions[current]?.includes(next)) {
    throw new BadRequestException(`Cannot transition estimate from ${current} to ${next}.`);
  }
}

export function calculateRequiredArea(
  netArea: Prisma.Decimal,
  wastePercent: Prisma.Decimal,
) {
  if (netArea.lessThan(0) || wastePercent.lessThan(0)) {
    throw new BadRequestException("Area calculations cannot involve negative values.");
  }

  return netArea.mul(new Prisma.Decimal(1).plus(wastePercent.div(100)));
}

export function calculateEstimateLine(input: {
  lineType: EstimateLineType;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  unitSellPrice: Prisma.Decimal;
  vatRate: Prisma.Decimal;
}) {
  const { quantity, unitCost, unitSellPrice, vatRate } = input;
  if (
    quantity.lessThan(0) ||
    unitCost.lessThan(0) ||
    unitSellPrice.lessThan(0) ||
    vatRate.lessThan(0)
  ) {
    throw new BadRequestException("Estimate calculations cannot involve negative values.");
  }

  const sign = input.lineType === EstimateLineType.DISCOUNT ? new Prisma.Decimal(-1) : new Prisma.Decimal(1);
  const costTotal = quantity.mul(unitCost);
  const sellTotal = quantity.mul(unitSellPrice).mul(sign);
  const marginAmount = sellTotal.minus(costTotal.mul(sign));
  const marginPercent = sellTotal.equals(0) ? new Prisma.Decimal(0) : marginAmount.div(sellTotal).mul(100);
  const vatAmount = sellTotal.mul(vatRate);
  const lineTotal = sellTotal.plus(vatAmount);

  return {
    costTotal,
    sellTotal,
    marginAmount,
    marginPercent,
    vatAmount,
    lineTotal,
  };
}

export function summarizeEstimate(
  lines: Array<{
    lineType: EstimateLineType;
    costTotal: Prisma.Decimal;
    sellTotal: Prisma.Decimal;
    marginAmount: Prisma.Decimal;
    vatAmount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>,
  vatRate: Prisma.Decimal,
) {
  const subtotal = lines.reduce((sum, line) => sum.plus(line.sellTotal), new Prisma.Decimal(0));
  const materialCost = lines
    .filter((line) => line.lineType === EstimateLineType.MATERIAL)
    .reduce((sum, line) => sum.plus(line.costTotal), new Prisma.Decimal(0));
  const labourCost = lines
    .filter((line) => line.lineType === EstimateLineType.LABOUR)
    .reduce((sum, line) => sum.plus(line.costTotal), new Prisma.Decimal(0));
  const accessoryCost = lines
    .filter(
      (line) =>
        line.lineType === EstimateLineType.ACCESSORY ||
        line.lineType === EstimateLineType.SERVICE,
    )
    .reduce((sum, line) => sum.plus(line.costTotal), new Prisma.Decimal(0));
  const supplierCost = materialCost.plus(accessoryCost);
  const discountAmount = lines
    .filter((line) => line.lineType === EstimateLineType.DISCOUNT)
    .reduce((sum, line) => sum.plus(line.sellTotal.abs()), new Prisma.Decimal(0));
  const vatAmount = lines.reduce((sum, line) => sum.plus(line.vatAmount), new Prisma.Decimal(0));
  const grandTotal = lines.reduce((sum, line) => sum.plus(line.lineTotal), new Prisma.Decimal(0));
  const grossProfit = subtotal.minus(materialCost).minus(labourCost).minus(accessoryCost);
  const grossMarginPercent = subtotal.equals(0)
    ? new Prisma.Decimal(0)
    : grossProfit.div(subtotal).mul(100);

  return {
    subtotal,
    materialCost,
    labourCost,
    accessoryCost,
    supplierCost,
    marginAmount: grossProfit,
    discountAmount,
    vatRate,
    vatAmount,
    grandTotal,
    grossProfit,
    grossMarginPercent,
  };
}
