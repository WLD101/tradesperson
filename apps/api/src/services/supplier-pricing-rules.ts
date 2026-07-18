import { BadRequestException } from "@nestjs/common";
import {
  SupplierPriceBasis,
  SupplierPriceImportStatus,
  SupplierPriceListStatus,
  type SupplierPriceSourceType,
} from "@prisma/client";

type DecimalLike = number | string | { toString(): string } | null | undefined;

type PriceDatesInput = {
  effectiveDate: Date;
  expiryDate?: Date | null | undefined;
};

type PromotionInput = {
  promotionalCost?: DecimalLike;
  promotionStart?: Date | null | undefined;
  promotionEnd?: Date | null | undefined;
};

type QuantityBreakInput = {
  quantityFrom?: DecimalLike;
  quantityTo?: DecimalLike;
  minimumOrderQty?: DecimalLike;
};

type BasisCompatibilityInput = {
  priceBasis: SupplierPriceBasis;
  supplierUnitCode?: string | null | undefined;
  productCategorySlug?: string | null | undefined;
  packQuantity?: DecimalLike;
  packCoverageM2?: DecimalLike;
  rollWidthM?: DecimalLike;
  standardRollLengthM?: DecimalLike;
};

type PriceCandidate = {
  id: string;
  baseCost: DecimalLike;
  promotionalCost?: DecimalLike;
  effectiveDate: Date;
  expiryDate?: Date | null | undefined;
  quantityFrom?: DecimalLike;
  quantityTo?: DecimalLike;
  promotionStart?: Date | null | undefined;
  promotionEnd?: Date | null | undefined;
  createdAt: Date;
  priceListVersion: {
    status: SupplierPriceListStatus;
    effectiveDate: Date;
    expiryDate?: Date | null | undefined;
  };
};

const MUTABLE_PRICE_LIST_STATUSES = new Set<SupplierPriceListStatus>([
  SupplierPriceListStatus.DRAFT,
  SupplierPriceListStatus.VALIDATED,
  SupplierPriceListStatus.REJECTED,
]);

const lifecycleTransitions: Record<
  SupplierPriceListStatus,
  SupplierPriceListStatus[]
> = {
  DRAFT: [SupplierPriceListStatus.VALIDATED, SupplierPriceListStatus.REJECTED],
  VALIDATED: [
    SupplierPriceListStatus.APPROVED,
    SupplierPriceListStatus.REJECTED,
  ],
  APPROVED: [SupplierPriceListStatus.ACTIVE],
  ACTIVE: [
    SupplierPriceListStatus.SUPERSEDED,
    SupplierPriceListStatus.EXPIRED,
  ],
  SUPERSEDED: [SupplierPriceListStatus.ARCHIVED],
  EXPIRED: [SupplierPriceListStatus.ARCHIVED],
  REJECTED: [SupplierPriceListStatus.DRAFT, SupplierPriceListStatus.ARCHIVED],
  ARCHIVED: [],
};

const importLifecycleTransitions: Record<
  SupplierPriceImportStatus,
  SupplierPriceImportStatus[]
> = {
  DRAFT: [
    SupplierPriceImportStatus.VALIDATED,
    SupplierPriceImportStatus.REJECTED,
    SupplierPriceImportStatus.ARCHIVED,
  ],
  VALIDATED: [
    SupplierPriceImportStatus.DRAFT,
    SupplierPriceImportStatus.APPROVED,
    SupplierPriceImportStatus.REJECTED,
    SupplierPriceImportStatus.ARCHIVED,
  ],
  APPROVED: [
    SupplierPriceImportStatus.EXECUTING,
    SupplierPriceImportStatus.REJECTED,
  ],
  EXECUTING: [
    SupplierPriceImportStatus.EXECUTED,
    SupplierPriceImportStatus.FAILED,
  ],
  EXECUTED: [],
  FAILED: [
    SupplierPriceImportStatus.DRAFT,
    SupplierPriceImportStatus.REJECTED,
    SupplierPriceImportStatus.ARCHIVED,
  ],
  REJECTED: [
    SupplierPriceImportStatus.DRAFT,
    SupplierPriceImportStatus.ARCHIVED,
  ],
  ARCHIVED: [],
};

export function normalizeCurrencyCode(currency: string) {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new BadRequestException("Currency must be a three-letter ISO code.");
  }

  return normalized;
}

export function assertPriceListDates(input: PriceDatesInput) {
  if (input.expiryDate && input.expiryDate <= input.effectiveDate) {
    throw new BadRequestException("Expiry date must be after the effective date.");
  }
}

export function assertPromotionDates(input: PromotionInput) {
  if (!input.promotionalCost) {
    return;
  }

  if (!input.promotionStart || !input.promotionEnd) {
    throw new BadRequestException(
      "Promotion start and end dates are required when a promotional cost is set.",
    );
  }

  if (input.promotionEnd <= input.promotionStart) {
    throw new BadRequestException("Promotion end date must be after the start date.");
  }
}

export function assertQuantityBreak(input: QuantityBreakInput) {
  const quantityFrom = toNumber(input.quantityFrom);
  const quantityTo = toNumber(input.quantityTo);
  const minimumOrderQty = toNumber(input.minimumOrderQty);

  if (quantityFrom != null && quantityFrom < 0) {
    throw new BadRequestException("Quantity from must be zero or greater.");
  }

  if (quantityTo != null && quantityTo <= 0) {
    throw new BadRequestException("Quantity to must be greater than zero.");
  }

  if (quantityFrom != null && quantityTo != null && quantityTo < quantityFrom) {
    throw new BadRequestException(
      "Quantity to must be greater than or equal to quantity from.",
    );
  }

  if (minimumOrderQty != null && minimumOrderQty < 0) {
    throw new BadRequestException("Minimum order quantity cannot be negative.");
  }
}

export function assertLifecycleTransition(
  current: SupplierPriceListStatus,
  next: SupplierPriceListStatus,
) {
  if (current === next) {
    return;
  }

  if (!lifecycleTransitions[current].includes(next)) {
    throw new BadRequestException(
      `Price list status cannot transition from ${current} to ${next}.`,
    );
  }
}

export function assertImportLifecycleTransition(
  current: SupplierPriceImportStatus,
  next: SupplierPriceImportStatus,
) {
  if (current === next) {
    return;
  }

  if (!importLifecycleTransitions[current].includes(next)) {
    throw new BadRequestException(
      `Import status cannot transition from ${current} to ${next}.`,
    );
  }
}

export function assertImportEditableForMapping(status: SupplierPriceImportStatus) {
  const editableStatuses = new Set<SupplierPriceImportStatus>([
    SupplierPriceImportStatus.DRAFT,
    SupplierPriceImportStatus.VALIDATED,
    SupplierPriceImportStatus.FAILED,
    SupplierPriceImportStatus.REJECTED,
  ]);
  if (!editableStatuses.has(status)) {
    throw new BadRequestException(
      "Only draft, validated, failed, or rejected imports can be remapped.",
    );
  }
}

export function assertImportExecutable(status: SupplierPriceImportStatus) {
  if (status !== SupplierPriceImportStatus.APPROVED) {
    throw new BadRequestException("Only approved imports can be executed.");
  }
}

export function assertImportApprovable(status: SupplierPriceImportStatus) {
  assertImportLifecycleTransition(status, SupplierPriceImportStatus.APPROVED);
}

export function assertImportValidatable(status: SupplierPriceImportStatus) {
  assertImportLifecycleTransition(status, SupplierPriceImportStatus.VALIDATED);
}

export function assertMutablePriceListStatus(status: SupplierPriceListStatus) {
  if (!MUTABLE_PRICE_LIST_STATUSES.has(status)) {
    throw new BadRequestException(
      "Approved, active, superseded, expired, and archived price lists are immutable.",
    );
  }
}

export function assertPriceBasisCompatibility(input: BasisCompatibilityInput) {
  const category = input.productCategorySlug ?? null;
  const unit = input.supplierUnitCode?.toUpperCase() ?? null;
  const rollBased =
    toNumber(input.rollWidthM) != null || toNumber(input.standardRollLengthM) != null;
  const packBased =
    toNumber(input.packQuantity) != null || toNumber(input.packCoverageM2) != null;

  switch (input.priceBasis) {
    case SupplierPriceBasis.ROLL:
      if (!(unit === "ROLL" || rollCategory(category) || rollBased)) {
        throw new BadRequestException("Roll pricing requires a compatible roll product.");
      }
      return;
    case SupplierPriceBasis.PACK:
      if (!(unit === "PACK" || packCategory(category) || packBased)) {
        throw new BadRequestException("Pack pricing requires a compatible pack product.");
      }
      return;
    case SupplierPriceBasis.TUB:
    case SupplierPriceBasis.BAG:
    case SupplierPriceBasis.BOX:
    case SupplierPriceBasis.PAIR:
    case SupplierPriceBasis.SET:
      if (unit && unit !== input.priceBasis) {
        throw new BadRequestException(
          `${input.priceBasis} pricing requires a matching supplier unit.`,
        );
      }
      return;
    case SupplierPriceBasis.SQUARE_METRE:
      if (
        ![
          "carpet",
          "sheet-vinyl",
          "lvt",
          "laminate",
          "underlay",
        ].includes(category ?? "") &&
        !packBased &&
        !rollBased
      ) {
        throw new BadRequestException(
          "Square metre pricing requires a flooring product with measurable coverage.",
        );
      }
      return;
    case SupplierPriceBasis.LINEAR_METRE:
    case SupplierPriceBasis.METRE:
      if (!(unit === "LM" || rollCategory(category) || category === "door-profile")) {
        throw new BadRequestException(
          "Metre pricing requires a compatible linear or roll-based product.",
        );
      }
      return;
    case SupplierPriceBasis.EACH:
      return;
  }
}

export function selectCurrentPrice(
  prices: PriceCandidate[],
  at = new Date(),
  quantity?: DecimalLike,
) {
  const requestedQuantity = toNumber(quantity);
  const applicable = prices.filter((price) => {
    if (!isActiveOnDate(price.effectiveDate, price.expiryDate, at)) {
      return false;
    }

    const selectableStatuses = new Set<SupplierPriceListStatus>([
      SupplierPriceListStatus.APPROVED,
      SupplierPriceListStatus.ACTIVE,
    ]);
    if (!selectableStatuses.has(price.priceListVersion.status)) {
      return false;
    }

    if (
      !isActiveOnDate(
        price.priceListVersion.effectiveDate,
        price.priceListVersion.expiryDate,
        at,
      )
    ) {
      return false;
    }

    const from = toNumber(price.quantityFrom);
    const to = toNumber(price.quantityTo);
    if (requestedQuantity != null) {
      if (from != null && requestedQuantity < from) {
        return false;
      }
      if (to != null && requestedQuantity > to) {
        return false;
      }
    }

    return true;
  });

  applicable.sort((left, right) => {
    const leftPromo = isPromotionActive(left, at) ? 1 : 0;
    const rightPromo = isPromotionActive(right, at) ? 1 : 0;
    if (leftPromo !== rightPromo) {
      return rightPromo - leftPromo;
    }

    const leftQuantityFrom = toNumber(left.quantityFrom) ?? -1;
    const rightQuantityFrom = toNumber(right.quantityFrom) ?? -1;
    if (leftQuantityFrom !== rightQuantityFrom) {
      return rightQuantityFrom - leftQuantityFrom;
    }

    if (left.effectiveDate.getTime() !== right.effectiveDate.getTime()) {
      return right.effectiveDate.getTime() - left.effectiveDate.getTime();
    }

    if (left.createdAt.getTime() !== right.createdAt.getTime()) {
      return right.createdAt.getTime() - left.createdAt.getTime();
    }

    return left.id.localeCompare(right.id);
  });

  return applicable[0] ?? null;
}

export function buildPriceHistoryReason(sourceType: SupplierPriceSourceType, note?: string) {
  return note?.trim() || `Price updated via ${sourceType.toLowerCase().replaceAll("_", " ")}`;
}

function rollCategory(category: string | null) {
  return ["carpet", "sheet-vinyl", "underlay"].includes(category ?? "");
}

function packCategory(category: string | null) {
  return ["lvt", "laminate"].includes(category ?? "");
}

function toNumber(value: DecimalLike) {
  if (value == null) {
    return null;
  }

  const numeric = Number(value.toString());
  return Number.isFinite(numeric) ? numeric : null;
}

function isPromotionActive(price: PriceCandidate, at: Date) {
  if (!price.promotionalCost || !price.promotionStart || !price.promotionEnd) {
    return false;
  }

  return price.promotionStart <= at && price.promotionEnd >= at;
}

function isActiveOnDate(
  effectiveDate: Date,
  expiryDate: Date | null | undefined,
  at: Date,
) {
  return effectiveDate <= at && (!expiryDate || expiryDate >= at);
}
