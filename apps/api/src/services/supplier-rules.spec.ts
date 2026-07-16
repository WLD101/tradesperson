import { describe, expect, it } from "vitest";
import {
  assertVariantMatchesProduct,
  normalizeSupplierCode,
  normalizeUkPostcode,
} from "./supplier-rules";

describe("supplier rules", () => {
  it("normalizes supplier codes", () => {
    expect(normalizeSupplierCode(" ab 12 / zx ")).toBe("AB-12-ZX");
  });

  it("normalizes uk postcodes", () => {
    expect(normalizeUkPostcode("m11aa")).toBe("M1 1AA");
  });

  it("validates product variant ownership", () => {
    expect(() => assertVariantMatchesProduct("a", "a")).not.toThrow();
    expect(() => assertVariantMatchesProduct("a", "b")).toThrow(
      "Supplier product variant must belong to the selected product.",
    );
  });
});
