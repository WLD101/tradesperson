import type { SessionContext } from "@tradesperson/types";
import { apiFetch } from "./api";

export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "CONVERTED";

export type QuoteLine = {
  id: string;
  lineType: string;
  description: string;
  quantity: string;
  unit: string;
  unitSellPrice: string;
  sellTotal: string;
  vatAmount: string;
  lineTotal: string;
};

export type Quote = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  title: string | null;
  currency: string;
  subtotal: string;
  vatAmount: string;
  grandTotal: string;
  depositRequired: string;
  depositPaid: string;
  validUntil: string | null;
  terms: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  createdAt: string;
  sentAt: string | null;
  approvedAt: string | null;
  customer?: { id: string; displayName: string };
  site?: { id: string; label: string };
  branch?: { id: string; name: string };
  estimate?: { id: string; estimateNumber: string; status: string } | null;
  lines: QuoteLine[];
  versions: Array<{ id: string; versionNumber: number; status: string; grandTotal: string; createdAt: string }>;
  _count?: { lines: number; versions: number };
};

export async function getQuotes(params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch<{ items: Quote[]; total: number; page: number; pageSize: number; totalPages: number }>(`/api/v1/quotes${qs ? `?${qs}` : ""}`);
}

export async function getQuote(id: string) {
  return apiFetch<Quote>(`/api/v1/quotes/${id}`);
}

export function getQuotePermissions(session: SessionContext | null) {
  const has = (permission: string) => membershipHasPermission(session, permission);
  return {
    canRead: has("quote:read"),
    canCreate: has("quote:create"),
    canWrite: has("quote:write"),
    canSend: has("quote:send"),
    canApprove: has("quote:approve"),
    canConvert: has("quote:convert"),
  };
}

function membershipHasPermission(session: SessionContext | null, permission: string) {
  if (!session?.activeTenantId) return false;
  const membership = session.memberships.find((item) => item.tenantId === session.activeTenantId && item.status === "ACTIVE");
  if (!membership) return false;
  if (membership.isOwner || membership.roleKeys.includes("BUSINESS_OWNER")) return true;
  return membership.permissions.includes(permission);
}
