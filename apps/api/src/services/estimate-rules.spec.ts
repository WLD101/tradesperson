import { BadRequestException } from "@nestjs/common";
import { EstimateLineType, EstimateStatus, Prisma } from "@prisma/client/index";
import { describe, expect, it } from "vitest";
import {
  assertEstimateMutable,
  assertEstimateTransition,
  calculateEstimateLine,
  calculateRequiredArea,
  summarizeEstimate,
} from "./estimate-rules";

describe("Estimate rules", () => {
  it("calculates waste-adjusted required area", () => {
    const requiredArea = calculateRequiredArea(
      new Prisma.Decimal("18.5"),
      new Prisma.Decimal("10"),
    );

    expect(requiredArea.toString()).toBe("20.35");
  });

  it("calculates sell, VAT and margin totals with Decimal precision", () => {
    const line = calculateEstimateLine({
      lineType: EstimateLineType.MATERIAL,
      quantity: new Prisma.Decimal("20.35"),
      unitCost: new Prisma.Decimal("16.25"),
      unitSellPrice: new Prisma.Decimal("31.5"),
      vatRate: new Prisma.Decimal("0.2"),
    });

    expect(line.costTotal.toString()).toBe("330.6875");
    expect(line.sellTotal.toString()).toBe("641.025");
    expect(line.vatAmount.toString()).toBe("128.205");
    expect(line.lineTotal.toString()).toBe("769.23");
  });

  it("summarizes material, labour, accessory and discount lines", () => {
    const material = calculateEstimateLine({
      lineType: EstimateLineType.MATERIAL,
      quantity: new Prisma.Decimal("10"),
      unitCost: new Prisma.Decimal("10"),
      unitSellPrice: new Prisma.Decimal("20"),
      vatRate: new Prisma.Decimal("0.2"),
    });
    const labour = calculateEstimateLine({
      lineType: EstimateLineType.LABOUR,
      quantity: new Prisma.Decimal("5"),
      unitCost: new Prisma.Decimal("15"),
      unitSellPrice: new Prisma.Decimal("30"),
      vatRate: new Prisma.Decimal("0.2"),
    });
    const discount = calculateEstimateLine({
      lineType: EstimateLineType.DISCOUNT,
      quantity: new Prisma.Decimal("1"),
      unitCost: new Prisma.Decimal("0"),
      unitSellPrice: new Prisma.Decimal("25"),
      vatRate: new Prisma.Decimal("0.2"),
    });

    const summary = summarizeEstimate(
      [
        { lineType: EstimateLineType.MATERIAL, ...material },
        { lineType: EstimateLineType.LABOUR, ...labour },
        { lineType: EstimateLineType.DISCOUNT, ...discount },
      ],
      new Prisma.Decimal("0.2"),
    );

    expect(summary.subtotal.toString()).toBe("325");
    expect(summary.materialCost.toString()).toBe("100");
    expect(summary.labourCost.toString()).toBe("75");
    expect(summary.discountAmount.toString()).toBe("25");
    expect(summary.grandTotal.toString()).toBe("390");
  });

  it("enforces lifecycle transitions and mutability", () => {
    expect(() =>
      assertEstimateTransition(EstimateStatus.CALCULATED, EstimateStatus.READY_FOR_QUOTE),
    ).not.toThrow();
    expect(() => assertEstimateMutable(EstimateStatus.CALCULATED)).not.toThrow();
    expect(() => assertEstimateMutable(EstimateStatus.READY_FOR_QUOTE)).toThrow(
      BadRequestException,
    );
    expect(() =>
      assertEstimateTransition(EstimateStatus.DRAFT, EstimateStatus.QUOTED),
    ).toThrow(BadRequestException);
  });

  it("rejects negative calculation inputs", () => {
    expect(() =>
      calculateRequiredArea(new Prisma.Decimal("-1"), new Prisma.Decimal("10")),
    ).toThrow(BadRequestException);
    expect(() =>
      calculateEstimateLine({
        lineType: EstimateLineType.MATERIAL,
        quantity: new Prisma.Decimal("1"),
        unitCost: new Prisma.Decimal("-2"),
        unitSellPrice: new Prisma.Decimal("3"),
        vatRate: new Prisma.Decimal("0.2"),
      }),
    ).toThrow(BadRequestException);
  });
});
