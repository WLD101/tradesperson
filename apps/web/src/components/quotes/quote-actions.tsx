"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveQuote, rejectQuote, sendQuote } from "@/lib/quotes-client";
import { createJobFromQuote } from "@/lib/jobs-client";

export function QuoteActions({
  quoteId,
  status,
  canSend,
  canApprove,
  canConvert,
}: {
  quoteId: string;
  status: string;
  canSend: boolean;
  canApprove: boolean;
  canConvert: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "send" | "approve" | "reject" | "job") => {
    setPending(action);
    setError(null);
    try {
      if (action === "send") await sendQuote(quoteId);
      if (action === "approve") await approveQuote(quoteId);
      if (action === "reject") await rejectQuote(quoteId);
      if (action === "job") {
        const job = await createJobFromQuote(quoteId);
        router.push(`/app/jobs/${job.id}`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote action failed.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      {canSend && status === "DRAFT" ? (
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={pending === "send"} onClick={() => run("send")}>
          {pending === "send" ? "Sending..." : "Mark Sent"}
        </button>
      ) : null}
      {canApprove && status === "SENT" ? (
        <>
          <button className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={pending === "approve"} onClick={() => run("approve")}>
            {pending === "approve" ? "Approving..." : "Approve"}
          </button>
          <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={pending === "reject"} onClick={() => run("reject")}>
            Reject
          </button>
        </>
      ) : null}
      {canConvert && status === "APPROVED" ? (
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={pending === "job"} onClick={() => run("job")}>
          {pending === "job" ? "Creating..." : "Create Job"}
        </button>
      ) : null}
    </div>
  );
}
