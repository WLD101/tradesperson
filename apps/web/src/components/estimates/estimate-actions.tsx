"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markEstimateReadyForQuote, recalculateEstimate } from "@/lib/estimates-client";

export function EstimateActions({
  estimateId,
  status,
  canWrite,
  canCalculate,
  canApprove,
}: {
  estimateId: string;
  status: string;
  canWrite: boolean;
  canCalculate: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const editable = ["DRAFT", "CALCULATED"].includes(status);

  const run = async (action: "recalculate" | "ready") => {
    setError(null);
    setPending(action);
    try {
      if (action === "recalculate") await recalculateEstimate(estimateId);
      if (action === "ready") await markEstimateReadyForQuote(estimateId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      {canWrite && editable ? (
        <Link
          href={`/app/estimates/${estimateId}/edit`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit
        </Link>
      ) : null}
      {canCalculate && editable ? (
        <button
          type="button"
          disabled={pending === "recalculate"}
          onClick={() => run("recalculate")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending === "recalculate" ? "Recalculating..." : "Recalculate"}
        </button>
      ) : null}
      {canApprove && status === "CALCULATED" ? (
        <button
          type="button"
          disabled={pending === "ready"}
          onClick={() => run("ready")}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending === "ready" ? "Marking..." : "Ready for Quote"}
        </button>
      ) : null}
    </div>
  );
}
