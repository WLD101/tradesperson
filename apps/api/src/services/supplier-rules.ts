import { BadRequestException } from "@nestjs/common";

export function normalizeSupplierCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeUkPostcode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const compact = value.trim().toUpperCase().replace(/\s+/g, "");
  if (compact.length <= 3) {
    return compact;
  }

  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function assertSinglePrimaryContact(
  contacts: Array<{ id: string; isPrimary: boolean }>,
  nextPrimaryContactId?: string | null,
) {
  const primaryCount = contacts.filter((item) => item.isPrimary).length;
  if (primaryCount > 1) {
    throw new BadRequestException("Only one primary contact is allowed.");
  }

  if (nextPrimaryContactId) {
    const target = contacts.find((item) => item.id === nextPrimaryContactId);
    if (!target?.isPrimary) {
      throw new BadRequestException("Primary contact selection is invalid.");
    }
  }
}

export function assertVariantMatchesProduct(
  productId: string,
  variantProductId: string,
) {
  if (productId !== variantProductId) {
    throw new BadRequestException(
      "Supplier product variant must belong to the selected product.",
    );
  }
}
