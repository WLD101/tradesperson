"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import type { MembershipSummary } from "@tradesperson/types";
import { AuthCard, IndustrialAuthShell } from "@/components/auth/industrial-auth-shell";

export function SelectTenantClient({
  memberships,
}: {
  memberships: MembershipSummary[];
}) {
  const router = useRouter();
  const [openingTenantId, setOpeningTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeMemberships = memberships.filter((membership) => membership.status === "ACTIVE");

  const openTenant = (tenantId: string) => {
    setOpeningTenantId(tenantId);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/select`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          setError("Workspace could not be opened. Please try again.");
          setOpeningTenantId(null);
          return;
        }

        router.refresh();
        router.push("/app/dashboard");
      } catch {
        setError("Workspace service is not reachable. Start the API preview, then try again.");
        setOpeningTenantId(null);
        return;
      }
    });
  };

  return (
    <IndustrialAuthShell headline="Choose the workspace context for this secure session.">
      <AuthCard eyebrow="Workspace selection" subtitle="Tenant and branch context keep every trade operation isolated and auditable." title="Select workspace">
        <div className="space-y-3">
          {activeMemberships.length > 0 ? (
            activeMemberships.map((membership) => (
              <button
                key={membership.id}
                className="group w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-stitch transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-stitch-overlay"
                disabled={isPending}
                onClick={() => openTenant(membership.tenantId)}
                type="button"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Building2 className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black text-slate-950">{membership.tenantName}</h2>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">{membership.roleKeys.join(", ")}</p>
                    </div>
                  </div>
                  <span className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white">
                    {openingTenantId === membership.tenantId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Open
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-6 text-center">
              <h2 className="text-xl font-black text-slate-950">No active workspaces</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Create a workspace or ask an owner to invite this account.</p>
              <Link className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-300 px-5 text-sm font-black text-slate-950" href="/website/onboarding">
                Create Workspace
              </Link>
            </div>
          )}
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/70 p-4">
          <Link href="/sign-in" className="text-sm font-black text-slate-600 hover:text-slate-950">
            Use a different account
          </Link>
          <Link href="/website/onboarding" className="text-sm font-black text-emerald-800">
            Create Workspace
          </Link>
        </div>
      </AuthCard>
    </IndustrialAuthShell>
  );
}
