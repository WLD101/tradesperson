import type { SessionContext } from "@tradesperson/types";
import { apiFetch } from "./api";

// Enums
export type PurchaseRequisitionStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "ORDERED" | "CANCELLED";
export type PurchaseOrderStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ISSUED" | "CANCELLED";
export type PurchaseOrderVersionStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ISSUED" | "CANCELLED";
export type SupplierAcknowledgementStatus = "PENDING" | "ACCEPTED" | "ACCEPTED_WITH_CHANGES" | "REJECTED";
export type PurchaseOrderDeliveryPlanStatus = "PLANNED" | "CONFIRMED" | "DELAYED" | "CANCELLED" | "COMPLETED";

// Base Models
export type PurchaseRequisitionLine = {
  id: string;
  productId: string;
  productVariantId: string | null;
  supplierProductId: string | null;
  preferredSupplierId: string | null;
  description: string;
  requestedQuantity: string;
  orderedQuantity: string;
  unit: string;
  estimatedUnitCost: string | null;
  estimatedTotal: string | null;
  requiredDate: string | null;
  notes: string | null;
  displayOrder: number;
  product?: { id: string; name: string; sku: string };
  variant?: { id: string; name: string; sku: string } | null;
  supplierProduct?: { id: string; supplierSku: string } | null;
  preferredSupplier?: { id: string; name: string } | null;
};

export type PurchaseRequisition = {
  id: string;
  requisitionNumber: string;
  status: PurchaseRequisitionStatus;
  branchId: string;
  createdById: string | null;
  approvedById: string | null;
  requiredDate: string | null;
  purpose: string | null;
  internalNotes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string };
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  lines: PurchaseRequisitionLine[];
};

export type PurchaseOrderLine = {
  id: string;
  purchaseOrderVersionId: string;
  purchaseRequisitionLineId: string | null;
  productId: string;
  productVariantId: string | null;
  supplierProductId: string | null;
  supplierSku: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
  lineSubtotal: string;
  taxRate: string | null;
  taxAmount: string;
  lineTotal: string;
  requiredDate: string | null;
  expectedDate: string | null;
  notes: string | null;
  displayOrder: number;
};

export type PurchaseOrderVersion = {
  id: string;
  purchaseOrderId: string;
  versionNumber: number;
  status: PurchaseOrderVersionStatus;
  currency: string;
  subtotal: string;
  taxAmount: string;
  deliveryAmount: string;
  total: string;
  requiredDate: string | null;
  expectedDate: string | null;
  deliveryAddress: string | null;
  supplierReference: string | null;
  terms: string | null;
  notes: string | null;
  createdById: string | null;
  approvedById: string | null;
  issuedById: string | null;
  approvedAt: string | null;
  lines: PurchaseOrderLine[];
};

export type SupplierAcknowledgement = {
  id: string;
  purchaseOrderId: string;
  purchaseOrderVersionId: string | null;
  status: SupplierAcknowledgementStatus;
  supplierReference: string | null;
  acknowledgedAt: string | null;
  expectedDeliveryDate: string | null;
  notes: string | null;
  createdAt: string;
};

export type PurchaseOrderDeliveryPlan = {
  id: string;
  purchaseOrderId: string;
  purchaseOrderVersionId: string | null;
  expectedDate: string | null;
  deliveryAddress: string | null;
  status: PurchaseOrderDeliveryPlanStatus;
  supplierReference: string | null;
  notes: string | null;
  createdAt: string;
};

export type PurchaseOrder = {
  id: string;
  branchId: string;
  supplierId: string;
  purchaseRequisitionId: string | null;
  purchaseOrderNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  subtotal: string;
  taxAmount: string;
  deliveryAmount: string;
  total: string;
  requiredDate: string | null;
  expectedDate: string | null;
  deliveryAddress: string | null;
  supplierReference: string | null;
  internalNotes: string | null;
  createdById: string | null;
  approvedById: string | null;
  issuedById: string | null;
  supplier: { id: string; name: string };
  branch: { id: string; name: string };
  versions: PurchaseOrderVersion[];
  acknowledgements: SupplierAcknowledgement[];
  deliveryPlans: PurchaseOrderDeliveryPlan[];
};

// Lists
export type PaginatedList<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type RequisitionListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  branchId?: string;
  search?: string;
};

export type PurchaseOrderListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  branchId?: string;
  supplierId?: string;
  search?: string;
};

// API Helpers
export async function getRequisitions(params?: RequisitionListParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
  if (params?.status) query.set("status", params.status);
  if (params?.branchId) query.set("branchId", params.branchId);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  return apiFetch<PaginatedList<PurchaseRequisition>>(`/api/v1/procurement/requisitions${qs ? `?${qs}` : ""}`);
}

export async function getRequisition(id: string) {
  return apiFetch<PurchaseRequisition>(`/api/v1/procurement/requisitions/${id}`);
}

export async function getPurchaseOrders(params?: PurchaseOrderListParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", params.page.toString());
  if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
  if (params?.status) query.set("status", params.status);
  if (params?.branchId) query.set("branchId", params.branchId);
  if (params?.supplierId) query.set("supplierId", params.supplierId);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  return apiFetch<PaginatedList<PurchaseOrder>>(`/api/v1/procurement/purchase-orders${qs ? `?${qs}` : ""}`);
}

export async function getPurchaseOrder(id: string) {
  return apiFetch<PurchaseOrder>(`/api/v1/procurement/purchase-orders/${id}`);
}

export function getProcurementPermissions(session: SessionContext | null) {
  if (!session) {
    return {
      canViewRequisition: false,
      canManageRequisition: false,
      canApproveRequisition: false,
      canViewPo: false,
      canManagePo: false,
      canApprovePo: false,
      canIssuePo: false,
      canViewCost: false,
      canOverrideCost: false,
      canManageAcknowledgement: false,
      canManageDeliveryPlan: false,
    };
  }

  const membershipHasPermission = (permission: string) => {
    if (!session.activeTenantId) return false;
    const membership = session.memberships.find(
      (item) => item.tenantId === session.activeTenantId && item.status === "ACTIVE",
    );
    if (!membership) return false;
    if (membership.isOwner || membership.roleKeys.includes("BUSINESS_OWNER")) return true;
    return membership.permissions.includes(permission);
  };

  return {
    canViewRequisition: membershipHasPermission("procurement:requisition:read"),
    canManageRequisition: membershipHasPermission("procurement:requisition:write"),
    canApproveRequisition: membershipHasPermission("procurement:requisition:approve"),
    canViewPo: membershipHasPermission("procurement:order:read"),
    canManagePo: membershipHasPermission("procurement:order:write"),
    canApprovePo: membershipHasPermission("procurement:order:approve"),
    canIssuePo: membershipHasPermission("procurement:order:issue"),
    canViewCost: membershipHasPermission("procurement:cost:read"),
    canOverrideCost: membershipHasPermission("procurement:cost:override"),
    canManageAcknowledgement: membershipHasPermission("procurement:acknowledgement:write"),
    canManageDeliveryPlan: membershipHasPermission("procurement:delivery-plan:write"),
  };
}
