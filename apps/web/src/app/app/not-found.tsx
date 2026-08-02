import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-3 text-slate-400">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-slate-900">Page not found</h2>
      <p className="mb-6 max-w-md text-sm text-slate-500">
        The record or page you're looking for doesn't exist, has been moved, or you don't have permission to view it.
      </p>
      <Link
        href="/app"
        className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
