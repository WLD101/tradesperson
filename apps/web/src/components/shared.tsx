import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, FileX } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-4">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-900 transition-colors font-medium">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({ 
  title, 
  description, 
  actions 
}: { 
  title: string; 
  description?: string; 
  actions?: React.ReactNode; 
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center space-x-3 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status, color }: { status: string; color?: "slate" | "green" | "blue" | "amber" | "red" }) {
  const colorMap = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  
  const c = color || "slate";
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[c]}`}>
      {status}
    </span>
  );
}

export function SummaryStrip({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 py-4 px-5 bg-white border border-slate-200 rounded-lg shadow-sm mb-6">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</span>
          <span className="mt-1 text-sm font-medium text-slate-900">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ 
  headers, 
  children 
}: { 
  headers: React.ReactNode[]; 
  children: React.ReactNode; 
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ 
  title, 
  description, 
  action 
}: { 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center bg-slate-50/50">
      <FileX className="h-10 w-10 text-slate-400 mb-4" />
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

export function DateDisplay({ date }: { date: string | Date | null | undefined }) {
  if (!date) return <span className="text-slate-400">-</span>;
  return <span>{format(new Date(date), "dd MMM yyyy")}</span>;
}

export function Money({ amount, currency = "GBP" }: { amount: number | null | undefined; currency?: string }) {
  if (amount == null) return <span className="text-slate-400">-</span>;
  return <span>{new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount)}</span>;
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-200">{children}</div>;
}

export function LoadingSkeleton({ className = "h-4 w-full bg-slate-200 animate-pulse rounded" }: { className?: string }) {
  return <div className={className} />;
}

export function ActivityTimeline({ items }: { items: { id: string; user: string; action: string; date: string }[] }) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="flex gap-4">
          <div className="relative mt-1">
            {i !== items.length - 1 && <div className="absolute left-2 top-2 -bottom-6 w-0.5 bg-slate-200" />}
            <div className="relative h-4 w-4 rounded-full border-2 border-slate-300 bg-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{item.user} <span className="font-normal text-slate-500">{item.action}</span></p>
            <p className="text-xs text-slate-500"><DateDisplay date={item.date} /></p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecordTabs({ tabs, activeTab, onChange }: { tabs: string[]; activeTab: string; onChange: (tab: string) => void }) {
  return (
    <div className="border-b border-slate-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab 
                ? "border-slate-900 text-slate-900" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 p-4 mt-6 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-end gap-3 rounded-b-xl">
      {children}
    </div>
  );
}

export function PermissionGate({ permission, children, fallback = null }: { permission: boolean; children: React.ReactNode; fallback?: React.ReactNode }) {
  if (!permission) return <>{fallback}</>;
  return <>{children}</>;
}
