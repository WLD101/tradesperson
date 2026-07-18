import type { SessionContext } from "@tradesperson/types";
import { apiFetch } from "./api";

export type SupplierStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type SupplierRecord = {
  id: string;
  branchId: string | null;
  legalName: string;
  tradingName: string | null;
  supplierCode: string;
  accountNumber: string | null;
  email: string | null;
  telephone: string | null;
  city: string | null;
  postcode: string | null;
  countryCode: string;
  defaultCurrency: string;
  typicalLeadTimeDays: number | null;
  preferredSupplier: boolean;
  status: SupplierStatus;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    telephone: string | null;
    isPrimary: boolean;
  }>;
  _count: {
    supplierProducts: number;
  };
};

export type SupplierListResponse = {
  items: SupplierRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SupplierContactRecord = {
  id: string;
  name: string;
  jobTitle: string | null;
  email: string | null;
  telephone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  isOrderingContact: boolean;
  isAccountsContact: boolean;
  isTechnicalContact: boolean;
  notes: string | null;
  status: SupplierStatus;
};

export type SupplierProductRecord = {
  id: string;
  supplierSku: string;
  supplierDescription: string | null;
  packQuantity: string | null;
  packCoverageM2: string | null;
  rollWidthM: string | null;
  standardRollLengthM: string | null;
  minimumOrderQty: string | null;
  leadTimeDays: number | null;
  preferredSupplier: boolean;
  status: SupplierStatus;
  lastConfirmedAt: string | null;
  notes: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    lifecycleStatus: "ACTIVE" | "DISCONTINUED" | "ARCHIVED";
  };
  variant: {
    id: string;
    name: string;
    sku: string;
    lifecycleStatus: "ACTIVE" | "DISCONTINUED" | "ARCHIVED";
  } | null;
  supplierUnit: {
    id: string;
    name: string;
    code: string;
    symbol: string | null;
  } | null;
};

export type SupplierPriceListStatus =
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "ACTIVE"
  | "SUPERSEDED"
  | "EXPIRED"
  | "REJECTED"
  | "ARCHIVED";

export type SupplierPriceSourceType =
  | "MANUAL"
  | "CSV_IMPORT"
  | "XLSX_IMPORT"
  | "NEGOTIATED"
  | "PROMOTION"
  | "SYSTEM";

export type SupplierPriceBasis =
  | "EACH"
  | "METRE"
  | "SQUARE_METRE"
  | "LINEAR_METRE"
  | "PACK"
  | "ROLL"
  | "TUB"
  | "BAG"
  | "BOX"
  | "PAIR"
  | "SET";

export type SupplierPriceImportStatus =
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "EXECUTING"
  | "EXECUTED"
  | "FAILED"
  | "REJECTED"
  | "ARCHIVED";

export type SupplierPriceImportFileType = "CSV" | "XLSX";

export type SupplierPriceImportRowStatus =
  | "VALID"
  | "INVALID"
  | "UNMATCHED"
  | "DUPLICATE"
  | "APPROVED"
  | "IMPORTED"
  | "SKIPPED";

export type SupplierPriceImportMatchMethod =
  | "SUPPLIER_PRODUCT_ID"
  | "SUPPLIER_SKU"
  | "PRODUCT_SKU"
  | "VARIANT_SKU"
  | "MANUAL"
  | "UNMATCHED";

export type SupplierPriceImportMessage = {
  code: string;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type SupplierPriceImportRowOverride = {
  supplierProductId?: string | null;
  productId?: string | null;
  variantId?: string | null;
};

export type SupplierPriceImportMappingSnapshot = {
  headers: string[];
  columns: Partial<
    Record<
      | "supplierSku"
      | "supplierProductId"
      | "productSku"
      | "productName"
      | "variantSku"
      | "unit"
      | "priceBasis"
      | "currency"
      | "baseCost"
      | "packCost"
      | "rollCost"
      | "areaCost"
      | "quantityFrom"
      | "quantityTo"
      | "minimumOrderQty"
      | "effectiveDate"
      | "expiryDate"
      | "promotionalCost"
      | "promotionStart"
      | "promotionEnd"
      | "taxTreatmentCode",
      string | null
    >
  >;
  rowOverrides?: Record<string, SupplierPriceImportRowOverride>;
};

export type SupplierPriceImportSummary = {
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  unmatchedRowCount: number;
  duplicateRowCount: number;
  importedRowCount?: number;
};

export type SupplierPriceImportRowRecord = {
  id: string;
  importId: string;
  supplierId: string;
  supplierProductId: string | null;
  matchedProductId: string | null;
  matchedVariantId: string | null;
  rowNumber: number;
  status: SupplierPriceImportRowStatus;
  duplicateKey: string | null;
  rawData: Record<string, string | null>;
  normalizedData: {
    supplierSku: string | null;
    supplierProductId: string | null;
    productSku: string | null;
    productName: string | null;
    variantSku: string | null;
    unit: string | null;
    priceBasis: SupplierPriceBasis | null;
    currency: string | null;
    baseCost: string | null;
    packCost: string | null;
    rollCost: string | null;
    areaCost: string | null;
    quantityFrom: string | null;
    quantityTo: string | null;
    minimumOrderQty: string | null;
    effectiveDate: string | null;
    expiryDate: string | null;
    promotionalCost: string | null;
    promotionStart: string | null;
    promotionEnd: string | null;
    taxTreatmentCode: string | null;
    matchMethod: SupplierPriceImportMatchMethod;
    executionStatus: "PENDING" | "IMPORTED";
    createdPriceId: string | null;
  } | null;
  errorMessages: SupplierPriceImportMessage[] | null;
  warningMessages: SupplierPriceImportMessage[] | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPriceImportRowsResponse = {
  items: SupplierPriceImportRowRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    rowCount: number;
    validRowCount: number;
    invalidRowCount: number;
    unmatchedRowCount: number;
    duplicateRowCount: number;
    importedRowCount: number;
    warningRowCount: number;
  };
};

export type SupplierPriceImportRecord = {
  id: string;
  tenantId: string;
  supplierId: string;
  priceListId: string | null;
  status: SupplierPriceImportStatus;
  fileType: SupplierPriceImportFileType;
  sourceFilename: string;
  worksheetName: string | null;
  headerRowNumber: number | null;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  unmatchedRowCount: number;
  duplicateRowCount: number;
  importedRowCount: number;
  mappingSnapshot: SupplierPriceImportMappingSnapshot | null;
  validationSummary: Record<string, unknown> | null;
  errorSummary: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  executedAt: string | null;
  createdById: string | null;
  approvedById: string | null;
  executedById: string | null;
  rows?: SupplierPriceImportRowRecord[];
};

export type SupplierPriceImportMappingRecord = {
  id: string;
  tenantId: string;
  supplierId: string;
  name: string;
  fileType: SupplierPriceImportFileType;
  mappingJson: SupplierPriceImportMappingSnapshot;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
};

export type SupplierPriceListRecord = {
  id: string;
  supplierId: string;
  name: string;
  reference: string | null;
  currency: string;
  status: SupplierPriceListStatus;
  sourceType: SupplierPriceSourceType;
  sourceFilename: string | null;
  effectiveDate: string;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: SupplierPriceListStatus;
    effectiveDate: string;
    expiryDate: string | null;
    currency: string;
    sourceType: SupplierPriceSourceType;
    revisionReason: string | null;
    _count: {
      prices: number;
    };
  }>;
  imports: Array<{
    id: string;
    status: SupplierPriceImportStatus;
    sourceFilename: string;
    createdAt: string;
    executedAt: string | null;
  }>;
  _count: {
    imports: number;
  };
};

export type SupplierPriceListVersionRecord = {
  id: string;
  priceListId: string;
  versionNumber: number;
  status: SupplierPriceListStatus;
  effectiveDate: string;
  expiryDate: string | null;
  currency: string;
  sourceType: SupplierPriceSourceType;
  sourceImportId: string | null;
  revisionReason: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  createdById: string | null;
  prices: SupplierProductPriceRecord[];
};

export type SupplierProductPriceRecord = {
  id: string;
  priceListVersionId: string;
  pricingUnitId: string | null;
  priceBasis: SupplierPriceBasis;
  currency: string;
  baseCost: string;
  packCost: string | null;
  rollCost: string | null;
  areaCost: string | null;
  quantityFrom: string | null;
  quantityTo: string | null;
  minimumOrderQty: string | null;
  deliveryCostPlaceholder: string | null;
  promotionalCost: string | null;
  promotionStart: string | null;
  promotionEnd: string | null;
  effectiveDate: string;
  expiryDate: string | null;
  taxTreatmentCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  priceListVersion: {
    id: string;
    versionNumber: number;
    status: SupplierPriceListStatus;
    priceListId?: string;
  };
  pricingUnit: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
  } | null;
};

export type ProductCurrentSupplierPrice = {
  supplierProductId: string;
  supplier: {
    id: string;
    legalName: string;
    tradingName: string | null;
    supplierCode: string;
    status: SupplierStatus;
  };
  supplierSku: string;
  supplierDescription: string | null;
  supplierUnit: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
  } | null;
  preferredSupplier: boolean;
  selectedPrice: SupplierProductPriceRecord | null;
  availablePrices: SupplierProductPriceRecord[];
};

export type SupplierDetail = Omit<SupplierRecord, "contacts" | "_count"> & {
  companyRegistrationNumber: string | null;
  vatRegistrationNumber: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  county: string | null;
  paymentTermsDescription: string | null;
  creditLimit: string | null;
  minimumOrderNotes: string | null;
  deliveryNotes: string | null;
  returnPolicyNotes: string | null;
  internalNotes: string | null;
  branch: { id: string; name: string } | null;
  contacts: SupplierContactRecord[];
  supplierProducts: SupplierProductRecord[];
};

export type SupplierProductOption = {
  id: string;
  name: string;
  sku: string;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    lifecycleStatus: "ACTIVE" | "DISCONTINUED" | "ARCHIVED";
  }>;
};

export type ProductSupplierLink = {
  id: string;
  supplierSku: string;
  supplierDescription: string | null;
  packQuantity: string | null;
  packCoverageM2: string | null;
  rollWidthM: string | null;
  standardRollLengthM: string | null;
  minimumOrderQty: string | null;
  leadTimeDays: number | null;
  preferredSupplier: boolean;
  status: SupplierStatus;
  lastConfirmedAt: string | null;
  supplier: {
    id: string;
    legalName: string;
    tradingName: string | null;
    supplierCode: string;
    status: SupplierStatus;
    preferredSupplier: boolean;
  };
  variant: {
    id: string;
    name: string;
    sku: string;
  } | null;
  supplierUnit: {
    id: string;
    name: string;
    code: string;
    symbol: string | null;
  } | null;
};

export async function fetchSupplierProductOptions() {
  const response = await apiFetch<{
    items: Array<{
      id: string;
      name: string;
      sku: string;
      variants: Array<{
        id: string;
        name: string;
        sku: string;
        lifecycleStatus: "ACTIVE" | "DISCONTINUED" | "ARCHIVED";
      }>;
    }>;
  }>("/api/v1/catalogue/products?pageSize=100&includeArchived=true&sort=nameAsc");

  return response.items;
}

export async function listSupplierPriceImports(supplierId: string) {
  return apiFetch<SupplierPriceImportRecord[]>(
    `/api/v1/suppliers/${supplierId}/price-imports`,
  );
}

export async function getSupplierPriceList(
  supplierId: string,
  priceListId: string,
) {
  return apiFetch<SupplierPriceListRecord>(
    `/api/v1/suppliers/${supplierId}/price-lists/${priceListId}`,
  );
}

export async function listSupplierPriceListVersions(
  supplierId: string,
  priceListId: string,
) {
  return apiFetch<SupplierPriceListVersionRecord[]>(
    `/api/v1/suppliers/${supplierId}/price-lists/${priceListId}/versions`,
  );
}

export async function getSupplierPriceListVersion(
  supplierId: string,
  priceListId: string,
  versionId: string,
) {
  return apiFetch<SupplierPriceListVersionRecord>(
    `/api/v1/suppliers/${supplierId}/price-lists/${priceListId}/versions/${versionId}`,
  );
}

export async function getSupplierPriceImport(
  supplierId: string,
  importId: string,
) {
  return apiFetch<SupplierPriceImportRecord>(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}`,
  );
}

export async function listSupplierPriceImportRows(
  supplierId: string,
  importId: string,
  params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: SupplierPriceImportRowStatus;
    matchStatus?:
      | "MATCHED"
      | "UNMATCHED"
      | "MANUAL"
      | "SUPPLIER_PRODUCT_ID"
      | "SUPPLIER_SKU"
      | "PRODUCT_SKU"
      | "VARIANT_SKU";
    executionStatus?: "PENDING" | "IMPORTED";
    duplicateOnly?: boolean;
    hasWarnings?: boolean;
    sort?: "rowNumberAsc" | "rowNumberDesc";
  },
) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.matchStatus) query.set("matchStatus", params.matchStatus);
  if (params?.executionStatus) query.set("executionStatus", params.executionStatus);
  if (params?.duplicateOnly) query.set("duplicateOnly", "true");
  if (params?.hasWarnings) query.set("hasWarnings", "true");
  if (params?.sort) query.set("sort", params.sort);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<SupplierPriceImportRowsResponse>(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}/rows${suffix}`,
  );
}

export async function listSupplierPriceImportMappings(supplierId: string) {
  return apiFetch<SupplierPriceImportMappingRecord[]>(
    `/api/v1/suppliers/${supplierId}/price-import-mappings`,
  );
}

export function getSupplierPermissions(session: SessionContext | null) {
  if (!session) {
    return {
      canView: false,
      canManage: false,
      canArchive: false,
      canManageContacts: false,
      canManageProducts: false,
      canViewPricing: false,
      canManagePricing: false,
      canApprovePricing: false,
      canImportPricing: false,
      canArchivePricing: false,
      canViewPricingHistory: false,
    };
  }

  return {
    canView: membershipHasPermission(session, "suppliers.view"),
    canManage: membershipHasPermission(session, "suppliers.manage"),
    canArchive: membershipHasPermission(session, "suppliers.archive"),
    canManageContacts: membershipHasPermission(
      session,
      "suppliers.contacts.manage",
    ),
    canManageProducts: membershipHasPermission(
      session,
      "suppliers.products.manage",
    ),
    canViewPricing: membershipHasPermission(session, "supplier_pricing.view"),
    canManagePricing: membershipHasPermission(session, "supplier_pricing.manage"),
    canApprovePricing: membershipHasPermission(
      session,
      "supplier_pricing.approve",
    ),
    canImportPricing: membershipHasPermission(session, "supplier_pricing.import"),
    canArchivePricing: membershipHasPermission(
      session,
      "supplier_pricing.archive",
    ),
    canViewPricingHistory: membershipHasPermission(
      session,
      "supplier_pricing.history.view",
    ),
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
