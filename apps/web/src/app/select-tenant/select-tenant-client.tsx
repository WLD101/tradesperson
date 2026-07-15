"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@tradesperson/ui";
import type { MembershipSummary } from "@tradesperson/types";

export function SelectTenantClient({
  memberships,
}: {
  memberships: MembershipSummary[];
}) {
  const router = useRouter();

  const openTenant = async (tenantId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/tenants/${tenantId}/select`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      return;
    }

    router.push("/app/dashboard");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6">
      <Card className="w-full space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Select a tenant
          </h1>
          <p className="text-sm text-slate-600">
            Choose the business context for this session.
          </p>
        </div>
        <div className="grid gap-3">
          {memberships
            .filter((membership) => membership.status === "ACTIVE")
            .map((membership) => (
              <div
                key={membership.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-medium text-slate-900">
                      {membership.tenantName}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {membership.roleKeys.join(", ")}
                    </p>
                  </div>
                  <Button
                    onClick={() => void openTenant(membership.tenantId)}
                    type="button"
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
        </div>
        <Link href="/sign-in" className="text-sm text-slate-500 underline">
          Use a different account
        </Link>
      </Card>
    </main>
  );
}
