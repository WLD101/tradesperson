import { SupplierPriceBasis, SupplierPriceListStatus } from "@prisma/client";
import { describe, expect, test } from "vitest";
import {
  assertImportApprovable,
  assertImportEditableForMapping,
  assertImportExecutable,
  assertImportLifecycleTransition,
  assertImportValidatable,
  assertLifecycleTransition,
  assertPriceBasisCompatibility,
  assertPriceListDates,
  assertPromotionDates,
  assertQuantityBreak,
  normalizeCurrencyCode,
  selectCurrentPrice,
} from "./supplier-pricing-rules";

describe("supplier pricing rules", () => {
  test("normalizes and validates currency codes", () => {
    expect(normalizeCurrencyCode(" gbp ")).toBe("GBP");
    expect(() => normalizeCurrencyCode("GB")).toThrow(
      "Currency must be a three-letter ISO code.",
    );
  });

  test("rejects invalid effective and expiry dates", () => {
    expect(() =>
      assertPriceListDates({
        effectiveDate: new Date("2026-07-16T00:00:00.000Z"),
        expiryDate: new Date("2026-07-15T00:00:00.000Z"),
      }),
    ).toThrow("Expiry date must be after the effective date.");
  });

  test("rejects incomplete promotions", () => {
    expect(() =>
      assertPromotionDates({
        promotionalCost: 10,
        promotionStart: new Date("2026-07-16T00:00:00.000Z"),
      }),
    ).toThrow(
      "Promotion start and end dates are required when a promotional cost is set.",
    );
  });

  test("rejects invalid quantity ranges", () => {
    expect(() =>
      assertQuantityBreak({
        quantityFrom: 10,
        quantityTo: 9,
      }),
    ).toThrow("Quantity to must be greater than or equal to quantity from.");
  });

  test("enforces lifecycle transitions", () => {
    expect(() =>
      assertLifecycleTransition(
        SupplierPriceListStatus.DRAFT,
        SupplierPriceListStatus.ACTIVE,
      ),
    ).toThrow("Price list status cannot transition from DRAFT to ACTIVE.");
  });

  test("enforces import lifecycle transitions", () => {
    expect(() =>
      assertImportLifecycleTransition("DRAFT", "EXECUTED"),
    ).toThrow("Import status cannot transition from DRAFT to EXECUTED.");
    expect(() => assertImportValidatable("DRAFT")).not.toThrow();
    expect(() => assertImportApprovable("VALIDATED")).not.toThrow();
    expect(() => assertImportExecutable("APPROVED")).not.toThrow();
    expect(() => assertImportEditableForMapping("FAILED")).not.toThrow();
    expect(() => assertImportEditableForMapping("EXECUTED")).toThrow(
      "Only draft, validated, failed, or rejected imports can be remapped.",
    );
  });

  test("validates price basis compatibility", () => {
    expect(() =>
      assertPriceBasisCompatibility({
        priceBasis: SupplierPriceBasis.ROLL,
        supplierUnitCode: "PACK",
        productCategorySlug: "lvt",
      }),
    ).toThrow("Roll pricing requires a compatible roll product.");

    expect(() =>
      assertPriceBasisCompatibility({
        priceBasis: SupplierPriceBasis.PACK,
        supplierUnitCode: "PACK",
        productCategorySlug: "lvt",
        packQuantity: 10,
      }),
    ).not.toThrow();
  });

  test("prefers active promotions and tighter quantity breaks", () => {
    const now = new Date("2026-07-16T12:00:00.000Z");
    const selected = selectCurrentPrice(
      [
        {
          id: "2",
          baseCost: "20.0000",
          promotionalCost: "15.0000",
          effectiveDate: new Date("2026-07-01T00:00:00.000Z"),
          expiryDate: null,
          quantityFrom: "5",
          quantityTo: "20",
          promotionStart: new Date("2026-07-10T00:00:00.000Z"),
          promotionEnd: new Date("2026-07-20T00:00:00.000Z"),
          createdAt: new Date("2026-07-10T00:00:00.000Z"),
          priceListVersion: {
            status: SupplierPriceListStatus.ACTIVE,
            effectiveDate: new Date("2026-07-01T00:00:00.000Z"),
            expiryDate: null,
          },
        },
        {
          id: "1",
          baseCost: "18.0000",
          effectiveDate: new Date("2026-07-01T00:00:00.000Z"),
          expiryDate: null,
          quantityFrom: null,
          quantityTo: null,
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          priceListVersion: {
            status: SupplierPriceListStatus.ACTIVE,
            effectiveDate: new Date("2026-07-01T00:00:00.000Z"),
            expiryDate: null,
          },
        },
      ],
      now,
      10,
    );

    expect(selected?.id).toBe("2");
  });
});
