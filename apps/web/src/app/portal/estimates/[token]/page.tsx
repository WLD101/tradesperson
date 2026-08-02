"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Button, Card } from "@tradesperson/ui";
import { StatusBadge } from "@/components/shared";

type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

type PublicEstimate = {
  tenant: { name: string; businessEmail: string | null; businessPhone: string | null };
  customer: { displayName: string; companyName: string | null };
  estimateNumber: string;
  status: string;
  subtotal: string;
  vatAmount: string;
  grandTotal: string;
  lines?: Array<{
    id: string;
    description: string;
    quantity: string;
    unitSellPrice: string;
    lineTotal: string;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function readEnvelope<T>(response: Response) {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.error || payload.data === undefined) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }
  return payload.data;
}

export default function PublicEstimatePage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  const [estimate, setEstimate] = useState<PublicEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEstimate() {
      try {
        const res = await fetch(`${apiUrl}/api/v1/public/portal/estimates/${params.token}`);
        setEstimate(await readEnvelope<PublicEstimate>(res));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Estimate link could not be loaded.");
      } finally {
        setLoading(false);
      }
    }
    void fetchEstimate();
  }, [params.token]);

  if (loading) return <div className="min-h-screen bg-stitch-background p-12 text-center text-sm text-slate-500">Loading estimate...</div>;
  if (!estimate && !error) return notFound();

  const handleAccept = async () => {
    if (!estimate || !signerName.trim()) {
      setError("Please enter your name to accept this estimate.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/public/portal/estimates/${params.token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName,
          signatureData: "typed-signature",
        }),
      });
      await readEnvelope(res);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept estimate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stitch-background px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mx-auto w-full max-w-4xl overflow-hidden p-0">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {estimate ? (
          <>
            <div className="bg-slate-950 p-6 text-white">
              <div className="flex flex-col justify-between gap-6 sm:flex-row">
                <div>
                  <p className="text-label-caps uppercase text-emerald-300">Customer Portal</p>
                  <h1 className="mt-2 text-2xl font-black tracking-tight">{estimate.tenant.name}</h1>
                  <div className="mt-4 text-sm text-slate-300">
                    <p>{estimate.tenant.businessEmail}</p>
                    <p>{estimate.tenant.businessPhone}</p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <h2 className="text-3xl font-black">Estimate</h2>
                  <p className="mt-1 font-mono text-slate-300">{estimate.estimateNumber}</p>
                  <div className="mt-4"><StatusBadge status={estimate.status} color="blue" /></div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-8">
                <h3 className="mb-2 text-label-caps uppercase text-slate-500">Prepared For</h3>
                <p className="text-sm font-bold text-slate-950">{estimate.customer.displayName}</p>
                {estimate.customer.companyName ? <p className="text-sm text-slate-600">{estimate.customer.companyName}</p> : null}
              </div>

              <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-label-caps uppercase text-slate-500">Description</th>
                      <th className="px-6 py-3 text-right text-label-caps uppercase text-slate-500">Qty</th>
                      <th className="px-6 py-3 text-right text-label-caps uppercase text-slate-500">Price</th>
                      <th className="px-6 py-3 text-right text-label-caps uppercase text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {estimate.lines?.length ? estimate.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="whitespace-normal px-6 py-4 text-sm font-semibold text-slate-950">{line.description}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-500">{line.quantity}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-sm text-slate-500">GBP {Number(line.unitSellPrice).toFixed(2)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-sm font-semibold text-slate-950">GBP {Number(line.lineTotal).toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No items on this estimate.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mb-8 ml-auto max-w-sm rounded-2xl bg-slate-950 p-5 text-white">
                <div className="mb-2 flex justify-between text-slate-300"><span>Subtotal</span><span className="font-mono">GBP {Number(estimate.subtotal).toFixed(2)}</span></div>
                <div className="mb-2 flex justify-between text-slate-300"><span>VAT</span><span className="font-mono">GBP {Number(estimate.vatAmount).toFixed(2)}</span></div>
                <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-lg font-bold"><span>Grand Total</span><span className="font-mono text-emerald-300">GBP {Number(estimate.grandTotal).toFixed(2)}</span></div>
              </div>

              {success ? (
                <div className="rounded-md border border-green-200 bg-green-50 p-6 text-center">
                  <h3 className="text-lg font-medium text-green-800">Estimate accepted</h3>
                  <p className="mt-2 text-green-600">Thank you. We will be in touch shortly to schedule your job.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="mb-4 text-title-md text-slate-950">Accept Estimate</h3>
                  <label className="mb-4 block text-sm font-semibold text-slate-700">
                    Print Name
                    <input
                      type="text"
                      value={signerName}
                      onChange={(event) => setSignerName(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 p-2 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="Type your full name"
                    />
                  </label>
                  <Button onClick={handleAccept} disabled={submitting || !signerName.trim()} className="w-full">
                    {submitting ? "Processing..." : "Accept estimate"}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
