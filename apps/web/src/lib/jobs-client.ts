import { clientApiFetch } from "./client-api";
import type { Job } from "./jobs";

export async function createJobFromQuote(quoteId: string, payload: unknown = {}) {
  return clientApiFetch<Job>(`/api/v1/quotes/${quoteId}/create-job`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
