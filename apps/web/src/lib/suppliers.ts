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

export function getSupplierPermissions(session: SessionContext | null) {
  if (!session) {
    return {
      canView: false,
      canManage: false,
      canArchive: false,
      canManageContacts: false,
      canManageProducts: false,
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
