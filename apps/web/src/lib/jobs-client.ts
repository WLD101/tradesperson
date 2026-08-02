import { clientApiFetch } from "./client-api";
import type { Job } from "./jobs";

export async function createJobFromQuote(quoteId: string, payload: unknown = {}) {
  return clientApiFetch<Job>(`/api/v1/quotes/${quoteId}/create-job`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function scheduleJobClient(jobId: string, payload: unknown) {
  return clientApiFetch<Job>(`/api/v1/jobs/${jobId}/schedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unscheduleJobClient(jobId: string) {
  return clientApiFetch<Job>(`/api/v1/jobs/${jobId}/unschedule`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
