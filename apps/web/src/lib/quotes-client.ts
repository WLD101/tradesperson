import { clientApiFetch } from "./client-api";
import type { Quote } from "./quotes";

export async function createQuoteFromEstimate(estimateId: string, payload: unknown = {}) {
  return clientApiFetch<Quote>(`/api/v1/estimates/${estimateId}/create-quote`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendQuote(id: string) {
  return clientApiFetch<Quote>(`/api/v1/quotes/${id}/send`, { method: "POST" });
}

export async function approveQuote(id: string) {
  return clientApiFetch<Quote>(`/api/v1/quotes/${id}/approve`, { method: "POST" });
}

export async function rejectQuote(id: string) {
  return clientApiFetch<Quote>(`/api/v1/quotes/${id}/reject`, { method: "POST" });
}
