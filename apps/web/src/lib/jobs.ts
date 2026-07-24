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
  accessNotes: string | null;
  workNotes: string | null;
  createdAt: string;
  customer?: { id: string; displayName: string };
  site?: { id: string; label: string; addressLine1?: string | null; city?: string | null; postcode?: string | null };
  branch?: { id: string; name: string };
  quote?: { id: string; quoteNumber: string; status: string; grandTotal: string } | null;
  materialRequirements?: MaterialRequirement[];
};

export type MaterialRequirement = {
  id: string;
  status: "PLANNED" | "PARTIALLY_ORDERED" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "ALLOCATED" | "CANCELLED";
  description: string;
  requiredQuantity: string;
  orderedQuantity: string;
  receivedQuantity: string;
  allocatedQuantity: string;
  unit: string;
  requiredDate: string | null;
  notes: string | null;
  product?: { id: string; name: string; sku: string } | null;
  productVariant?: { id: string; name: string; sku: string } | null;
  supplierProduct?: { id: string; supplierSku: string; supplierDescription: string | null } | null;
  sourceQuoteLine?: { id: string; description: string; quantity: string; unit: string } | null;
};

export async function getJobs(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch<{ items: Job[]; total: number; page: number; pageSize: number; totalPages: number }>(`/api/v1/jobs${qs ? `?${qs}` : ""}`);
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
