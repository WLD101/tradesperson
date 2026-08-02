export default function Loading() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  );
}
