type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

const clientApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function clientApiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${clientApiUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "content-type": "application/json" }),
      ...((init?.headers ?? {}) as HeadersInit),
    },
    credentials: "include",
    cache: "no-store",
  });

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error) {
    throw new ClientApiError(
      payload?.error?.message ??
        response.statusText ??
        `Request failed with status ${response.status}`,
      response.status,
    );
  }

  if (payload?.data === undefined) {
    throw new ClientApiError("Malformed API response.", response.status);
  }

  return payload.data;
}
