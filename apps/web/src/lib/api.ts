import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ApiResponse, SessionContext } from "@tradesperson/types";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return payload.data;
}

export async function getSession(required = true) {
  try {
    return await apiFetch<SessionContext>("/api/v1/auth/session");
  } catch {
    if (required) {
      redirect("/sign-in");
    }

    return null;
  }
}
