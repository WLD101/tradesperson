import type { SessionContext } from "@tradesperson/types";
import { apiFetch } from "./api";

export type Job = {
  id: string;
  jobNumber: string;
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  title: string | null;
  currency: string;
  totalValue: string;
  depositRequired: string;
  depositPaid: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  assignedInstallerId: string | null;
  installationTeamName: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  customerSignoffName: string | null;
  accessNotes: string | null;
  workNotes: string | null;
  createdAt: string;
  customer?: { id: string; displayName: string };
  site?: { id: string; label: string; addressLine1?: string | null; city?: string | null; postcode?: string | null };
  branch?: { id: string; name: string };
  quote?: { id: string; quoteNumber: string; status: string; grandTotal: string } | null;
  assignedInstaller?: { id: string; firstName: string; lastName: string; email: string } | null;
  profitability?: {
    revenue: string;
    invoicedTotal: string;
    paidAmount: string;
    balanceDue: string;
    estimatedMaterialCost: string;
    actualMaterialCost: string;
    labourCost: string;
    totalCost: string;
    grossProfit: string;
    grossMarginPercent: string;
  };
  materialRequirements?: MaterialRequirement[];
  invoices?: Invoice[];
};

export type MaterialRequirement = {
  id: string;
  status:
    | "PLANNED"
    | "PARTIALLY_REQUISITIONED"
    | "REQUISITIONED"
    | "PARTIALLY_ORDERED"
    | "ORDERED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "PARTIALLY_ALLOCATED"
    | "ALLOCATED"
    | "PARTIALLY_ISSUED"
    | "ISSUED"
    | "CANCELLED";
  description: string;
  requiredQuantity: string;
  requisitionedQuantity: string;
  orderedQuantity: string;
  receivedQuantity: string;
  allocatedQuantity: string;
  issuedQuantity: string;
  unit: string;
  requiredDate: string | null;
  notes: string | null;
  product?: { id: string; name: string; sku: string } | null;
  productVariant?: { id: string; name: string; sku: string } | null;
  supplierProduct?: { id: string; supplierSku: string; supplierDescription: string | null } | null;
  sourceQuoteLine?: { id: string; description: string; quantity: string; unit: string } | null;
  purchaseRequisitionLine?: {
    id: string;
    purchaseRequisition: { id: string; requisitionNumber: string; status: string };
  } | null;
  stockReservations?: Array<{
    id: string;
    status: "RESERVED" | "PARTIALLY_ISSUED" | "ISSUED" | "CANCELLED";
    reservedQuantity: string;
    issuedQuantity: string;
    unit: string;
    warehouse: { id: string; name: string; code: string };
  }>;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  currency: string;
  subtotal: string;
  vatAmount: string;
  total: string;
  paidAmount: string;
  balanceDue: string;
  issuedAt: string | null;
  dueDate: string | null;
  notes: string | null;
  payments?: Payment[];
};

export type Payment = {
  id: string;
  paymentNumber: string;
  status: "RECORDED" | "VOIDED";
  amount: string;
  currency: string;
  method: string | null;
  reference: string | null;
  paidAt: string;
  notes: string | null;
};

export type ScheduleInstaller = {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  status: string;
  userStatus: string;
  isOwner: boolean;
  defaultBranch: { id: string; name: string; branchCode: string } | null;
  roleKeys: string[];
};

export type ScheduleResponse = {
  range: { start: string; end: string };
  installers: ScheduleInstaller[];
  scheduledJobs: Job[];
  unscheduledJobs: Job[];
  totalScheduled: number;
  totalUnscheduled: number;
};

export async function getJobs(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch<{ items: Job[]; total: number; page: number; pageSize: number; totalPages: number }>(`/api/v1/jobs${qs ? `?${qs}` : ""}`);
}

export async function getSchedule(params: {
  start: string;
  end: string;
  branchId?: string;
  installerId?: string;
  status?: string;
  search?: string;
  unscheduledLimit?: number;
}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return apiFetch<ScheduleResponse>(`/api/v1/jobs/schedule?${query.toString()}`);
}

export async function getJob(id: string) {
  return apiFetch<Job>(`/api/v1/jobs/${id}`);
}

export async function generateJobMaterialRequirements(id: string) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/material-requirements/generate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createJobMaterialRequisition(id: string) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/material-requirements/create-requisition`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function reserveJobStock(id: string) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/material-requirements/reserve-stock`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function issueJobStock(id: string) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/material-requirements/issue-stock`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function returnJobStock(
  id: string,
  payload: {
    idempotencyKey?: string;
    notes?: string;
    lines: Array<{ stockReservationId: string; usableQuantity?: number; damagedQuantity?: number; notes?: string }>;
  },
) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/material-requirements/return-stock`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function scheduleJob(
  id: string,
  payload: {
    scheduledStart: string;
    scheduledEnd: string;
    assignedInstallerId?: string;
    installationTeamName?: string;
    accessNotes?: string;
    workNotes?: string;
  },
) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/schedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unscheduleJob(id: string) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/unschedule`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function completeJob(id: string, payload: { completionNotes?: string; customerSignoffName?: string }) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createJobInvoice(id: string, payload: { dueDate?: string; notes?: string } = {}) {
  return apiFetch<Job>(`/api/v1/jobs/${id}/create-invoice`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function recordInvoicePayment(
  invoiceId: string,
  payload: { amount: number; method?: string; reference?: string; idempotencyKey?: string; paidAt?: string; notes?: string },
) {
  return apiFetch<Job>(`/api/v1/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getJobPermissions(session: SessionContext | null) {
  const has = (permission: string) => membershipHasPermission(session, permission);
  return { canRead: has("job:read"), canCreate: has("job:create"), canWrite: has("job:write") };
}

function membershipHasPermission(session: SessionContext | null, permission: string) {
  if (!session?.activeTenantId) return false;
  const membership = session.memberships.find((item) => item.tenantId === session.activeTenantId && item.status === "ACTIVE");
  if (!membership) return false;
  if (membership.isOwner || membership.roleKeys.includes("BUSINESS_OWNER")) return true;
  return membership.permissions.includes(permission);
}
