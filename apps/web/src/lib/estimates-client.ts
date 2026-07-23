import { clientApiFetch } from "./client-api";
import type { Estimate } from "./estimates";

export async function createEstimate(payload: unknown) {
  return clientApiFetch<Estimate>("/api/v1/estimates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEstimate(id: string, payload: unknown) {
  return clientApiFetch<Estimate>(`/api/v1/estimates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function recalculateEstimate(id: string) {
  return clientApiFetch<Estimate>(`/api/v1/estimates/${id}/recalculate`, {
    method: "POST",
  });
}

export async function markEstimateReadyForQuote(id: string) {
  return clientApiFetch<Estimate>(`/api/v1/estimates/${id}/ready-for-quote`, {
    method: "POST",
  });
}
