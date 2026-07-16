import { describe, expect, test } from "vitest";
import { validateVariantForCategory } from "./catalogue-rules";

describe("catalogue variant rules", () => {
  test("requires roll fields for carpet categories", () => {
    expect(() =>
      validateVariantForCategory("carpet", {
        thicknessMm: 9,
      }),
    ).toThrow("Roll width is required for this category.");
  });

  test("requires pack fields for LVT categories", () => {
    expect(() =>
      validateVariantForCategory("lvt", {
        tileLengthMm: 610,
        tileWidthMm: 305,
      }),
    ).toThrow("Pack quantity is required for this category.");
  });

  test("requires tile dimensions for laminate pack categories", () => {
    expect(() =>
      validateVariantForCategory("laminate", {
        packQuantity: 8,
        packCoverageM2: 1.92,
      }),
    ).toThrow("Tile or plank length is required for this category.");
  });

  test("rejects negative decimals", () => {
    expect(() =>
      validateVariantForCategory("sheet-vinyl", {
        rollWidthM: -2,
        standardRollLengthM: 20,
      }),
    ).toThrow("Roll width must be a positive number.");
  });

  test("accepts valid roll-based categories", () => {
    expect(() =>
      validateVariantForCategory("sheet-vinyl", {
        rollWidthM: 2,
        standardRollLengthM: 20,
        thicknessMm: 2.5,
      }),
    ).not.toThrow();
  });

  test("accepts valid pack-based categories", () => {
    expect(() =>
      validateVariantForCategory("lvt", {
        packQuantity: 10,
        packCoverageM2: 2.12,
        tileLengthMm: 610,
        tileWidthMm: 305,
        wearLayerMm: 0.55,
      }),
    ).not.toThrow();
  });
});
