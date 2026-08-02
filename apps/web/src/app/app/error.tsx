"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-slate-900">Something went wrong</h2>
      <p className="mb-6 max-w-md text-sm text-slate-500">
        We encountered an unexpected error while trying to load this page. Our team has been notified.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => window.location.href = "/app"}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => reset()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
