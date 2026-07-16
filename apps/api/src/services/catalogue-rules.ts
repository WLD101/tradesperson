import { BadRequestException } from "@nestjs/common";

type VariantRuleInput = {
  packQuantity?: number | null | undefined;
  packCoverageM2?: number | null | undefined;
  rollWidthM?: number | null | undefined;
  standardRollLengthM?: number | null | undefined;
  tileLengthMm?: number | null | undefined;
  tileWidthMm?: number | null | undefined;
  thicknessMm?: number | null | undefined;
  wearLayerMm?: number | null | undefined;
};

const POSITIVE_DECIMAL_FIELDS: Array<[keyof VariantRuleInput, string]> = [
  ["packCoverageM2", "Pack coverage"],
  ["rollWidthM", "Roll width"],
  ["standardRollLengthM", "Standard roll length"],
  ["tileLengthMm", "Tile length"],
  ["tileWidthMm", "Tile width"],
  ["thicknessMm", "Thickness"],
  ["wearLayerMm", "Wear layer"],
];

export function validateVariantForCategory(
  categorySlug: string,
  input: VariantRuleInput,
) {
  for (const [field, label] of POSITIVE_DECIMAL_FIELDS) {
    const value = input[field];
    if (value != null && (!Number.isFinite(value) || value <= 0)) {
      throw new BadRequestException(`${label} must be a positive number.`);
    }
  }

  if (
    input.packQuantity != null &&
    (!Number.isInteger(input.packQuantity) || input.packQuantity <= 0)
  ) {
    throw new BadRequestException("Pack quantity must be a positive whole number.");
  }

  if (isRollCategory(categorySlug)) {
    requireField(input.rollWidthM, "Roll width");
    requireField(input.standardRollLengthM, "Standard roll length");
  }

  if (isPackCategory(categorySlug)) {
    requireField(input.packQuantity, "Pack quantity");
    requireField(input.packCoverageM2, "Pack coverage");
  }

  if (categorySlug === "lvt" || categorySlug === "laminate") {
    requireField(input.tileLengthMm, "Tile or plank length");
    requireField(input.tileWidthMm, "Tile or plank width");
  }
}

function requireField(value: number | null | undefined, label: string) {
  if (value == null) {
    throw new BadRequestException(`${label} is required for this category.`);
  }
}

function isRollCategory(categorySlug: string) {
  return ["carpet", "sheet-vinyl", "underlay"].includes(categorySlug);
}

function isPackCategory(categorySlug: string) {
  return ["lvt", "laminate"].includes(categorySlug);
}
