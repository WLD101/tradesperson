"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postGoodsReceipt } from "@/lib/procurement-client";
import type { GoodsReceipt } from "@/lib/procurement";

type Props = {
  receipt: GoodsReceipt;
  permissions: {
    canPostReceipt: boolean;
  };
};

export function GoodsReceiptWorkflow({ receipt, permissions }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await postGoodsReceipt(receipt.id);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post goods receipt");
      setIsSubmitting(false);
    }
  };

  if (receipt.status !== "DRAFT" || !permissions.canPostReceipt) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">Post Receipt</h2>
      <p className="mb-4 text-sm text-slate-500">
        Posting this receipt will permanently record these quantities and trigger any corresponding inventory movements. This action cannot be undone.
      </p>

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handlePost}
          disabled={isSubmitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Posting..." : "Post to Inventory"}
        </button>
      </div>
    </div>
  );
}
