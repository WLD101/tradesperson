import type { SessionContext } from "@tradesperson/types";
import { apiFetch } from "./api";

export type LookupRecord = {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  symbol?: string | null;
  kind?: string;
  description?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  manufacturer?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
};

export type ProductVariantSummary = {
  id: string;
  name: string;
  sku: string;
  colour: string | null;
  thicknessMm?: string | null;
  packCoverageM2?: string | null;
  lifecycleStatus: "ACTIVE" | "DISCONTINUED" | "ARCHIVED";
  isDefault: boolean;
};

export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  supplierSkuPlaceholder: string | null;
  description: string | null;
  material: string | null;
  colour: string | null;
  shade: string | null;
  pattern: string | null;
  fireRating: string | null;
  slipRating: string | null;
  acousticRating: string | null;
  domesticCommercialClass: string | null;
  warranty: string | null;
  recommendedAdhesive: string | null;
  recommendedUnderlay: string | null;
  technicalData: string | null;
  safetyData: string | null;
  underfloorHeatingCompatible: boolean | null;
  batchTrackingRequired: boolean;
  lifecycleStatus: "ACTIVE" | "DISCONTINUED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
  manufacturer: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  collection: { id: string; name: string } | null;
  primaryUnit: { id: string; name: string; code: string; symbol: string | null };
  variants: ProductVariantSummary[];
};

export type ProductVariantDetail = ProductVariantSummary & {
  unitOfMeasure: { id: string; name: string; code: string; symbol: string | null } | null;
  shade: string | null;
  pattern: string | null;
  rollWidthM: string | null;
  standardRollLengthM: string | null;
  tileLengthMm: string | null;
  tileWidthMm: string | null;
  wearLayerMm: string | null;
  packQuantity: number | null;
};

export type ProductDetail = Omit<ProductRecord, "variants"> & {
  variants: ProductVariantDetail[];
};

export type ProductListResponse = {
  items: ProductRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function fetchCatalogueLookups() {
  const [categories, manufacturers, brands, collections, units] =
    await Promise.all([
      apiFetch<LookupRecord[]>("/api/v1/catalogue/categories"),
      apiFetch<LookupRecord[]>("/api/v1/catalogue/manufacturers"),
      apiFetch<LookupRecord[]>("/api/v1/catalogue/brands"),
      apiFetch<LookupRecord[]>("/api/v1/catalogue/collections"),
      apiFetch<LookupRecord[]>("/api/v1/catalogue/units"),
    ]);

  return {
    categories,
    manufacturers,
    brands,
    collections,
    units,
  };
}

export function getCataloguePermissions(session: SessionContext | null) {
  if (!session) {
    return {
      canView: false,
      canManage: false,
      canArchive: false,
    };
  }

  return {
    canView: membershipHasPermission(session, "catalogue.view"),
    canManage: membershipHasPermission(session, "catalogue.manage"),
    canArchive: membershipHasPermission(session, "catalogue.archive"),
  };
}

function membershipHasPermission(
  session: SessionContext,
  permission: string,
) {
  if (!session.activeTenantId) {
    return false;
  }

  const membership = session.memberships.find(
    (item) =>
      item.tenantId === session.activeTenantId && item.status === "ACTIVE",
  );
  if (!membership) {
    return false;
  }

  if (membership.isOwner || membership.roleKeys.includes("BUSINESS_OWNER")) {
    return true;
  }

  return membership.permissions.includes(permission);
}
