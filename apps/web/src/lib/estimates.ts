import type { SessionContext } from "@tradesperson/types";
import { apiFetch } from "./api";

export type EstimateStatus =
  | "DRAFT"
  | "CALCULATED"
  | "READY_FOR_QUOTE"
  | "QUOTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export type EstimateLineType = "MATERIAL" | "LABOUR" | "ACCESSORY" | "SERVICE" | "DISCOUNT";

export type EstimateRoom = {
  id: string;
  roomName: string;
  grossArea: string;
  deductionArea: string;
  netArea: string;
  wastePercent: string;
  requiredArea: string;
  perimeter: string;
  notes: string | null;
};

export type EstimateLine = {
  id: string;
  estimateRoomId: string | null;
  lineType: EstimateLineType;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string | null;
  unitSellPrice: string;
  costTotal: string | null;
  sellTotal: string;
  marginAmount: string | null;
  marginPercent: string | null;
  vatRate: string;
  vatAmount: string;
  lineTotal: string;
  notes: string | null;
  product?: { id: string; name: string; sku: string } | null;
  productVariant?: { id: string; name: string; sku: string } | null;
  supplierProduct?: { id: string; supplierSku: string; supplierDescription: string | null } | null;
  estimateRoom?: { id: string; roomName: string } | null;
};

export type EstimateVersion = {
  id: string;
  versionNumber: number;
  status: string;
  subtotal: string;
  grandTotal: string;
  grossMarginPercent: string | null;
  createdAt: string;
};

export type Estimate = {
  id: string;
  estimateNumber: string;
  status: EstimateStatus;
  branchId: string | null;
  customerId: string;
  siteId: string;
  surveyId: string | null;
  title: string | null;
  currency: string;
  subtotal: string;
  materialCost: string | null;
  labourCost: string | null;
  accessoryCost: string | null;
  supplierCost: string | null;
  marginAmount: string | null;
  discountAmount: string;
  vatRate: string;
  vatAmount: string;
  grandTotal: string;
  grossProfit: string | null;
  grossMarginPercent: string | null;
  internalNotes: string | null;
  customerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; branchCode?: string } | null;
  customer?: { id: string; displayName: string; primaryEmail?: string | null; primaryPhone?: string | null };
  site?: { id: string; label: string; addressLine1?: string | null; city?: string | null; postcode?: string | null };
  survey?: { id: string; reference: string; status: string } | null;
  rooms: EstimateRoom[];
  lines: EstimateLine[];
  versions: EstimateVersion[];
  _count?: { rooms: number; lines: number; versions: number };
};

export type PaginatedList<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getEstimates(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch<PaginatedList<Estimate>>(`/api/v1/estimates${qs ? `?${qs}` : ""}`);
}

export async function getEstimate(id: string) {
  return apiFetch<Estimate>(`/api/v1/estimates/${id}`);
}

export function getEstimatePermissions(session: SessionContext | null) {
  const has = (permission: string) => membershipHasPermission(session, permission);
  return {
    canRead: has("estimate:read"),
    canCreate: has("estimate:create"),
    canWrite: has("estimate:write"),
    canCalculate: has("estimate:calculate"),
    canApprove: has("estimate:approve"),
    canViewCost: has("estimate:cost:read"),
    canOverrideCost: has("estimate:cost:override"),
  };
}

function membershipHasPermission(session: SessionContext | null, permission: string) {
  if (!session?.activeTenantId) return false;
  const membership = session.memberships.find(
    (item) => item.tenantId === session.activeTenantId && item.status === "ACTIVE",
  );
  if (!membership) return false;
  if (membership.isOwner || membership.roleKeys.includes("BUSINESS_OWNER")) return true;
  return membership.permissions.includes(permission);
}
