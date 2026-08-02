"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  Menu,
  Package,
  Rocket,
  Settings,
  ShoppingCart,
  UploadCloud,
  Users,
  Wrench,
  X,
} from "lucide-react";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
};

export type ShellNavGroup = {
  title: string;
  items: ShellNavItem[];
};

const icons = {
  dashboard: Home,
  crm: Users,
  scheduler: CalendarDays,
  estimates: ClipboardList,
  quotes: FileText,
  jobs: Wrench,
  procurement: ShoppingCart,
  inventory: Boxes,
  reports: BarChart3,
  finance: BarChart3,
  settings: Settings,
  catalogue: Package,
  business: Building2,
  onboarding: Rocket,
  imports: UploadCloud,
};

export function AppShellNav({
  groups,
  showDesktop = true,
}: {
  groups: ShellNavGroup[];
  showDesktop?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-controls="mobile-erp-navigation"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm lg:hidden"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className="sr-only">Open navigation</span>
        <Menu className="h-5 w-5" />
      </button>

      {showDesktop ? (
        <nav className="stitch-sidebar-scroll hidden h-full flex-col gap-5 overflow-y-auto overflow-x-hidden px-4 py-5 lg:flex" aria-label="Primary navigation">
          <NavContent groups={groups} variant="dark" />
        </nav>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            aria-label="Close navigation backdrop"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            type="button"
            onClick={() => setOpen(false)}
          />
          <aside
            id="mobile-erp-navigation"
            className="relative h-full w-[min(22rem,88vw)] overflow-y-auto bg-white shadow-stitch-overlay"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <BrandLockup compact />
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                type="button"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">Close navigation</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-5 px-4 py-5" aria-label="Mobile primary navigation">
              <NavContent groups={groups} onNavigate={() => setOpen(false)} variant="light" />
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="flex min-w-0 items-center gap-3" href="/app/dashboard">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-white/10">
        <Image
          alt="Tradesperson ERP logo"
          className="h-full w-full object-cover"
          height={40}
          src="/brand/tradesperson-erp-logo.png"
          width={40}
        />
      </span>
      {!compact ? (
        <span className="truncate text-base font-black tracking-tight text-slate-950 lg:text-white">Tradesperson ERP</span>
      ) : (
        <span className="truncate text-base font-black tracking-tight text-slate-950">Tradesperson ERP</span>
      )}
    </Link>
  );
}

function NavContent({
  groups,
  onNavigate,
  variant,
}: {
  groups: ShellNavGroup[];
  onNavigate?: (() => void) | undefined;
  variant: "dark" | "light";
}) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.title} className="min-w-0">
          <h2 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.title}</h2>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onNavigate} variant={variant} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function NavLink({
  item,
  onNavigate,
  variant,
}: {
  item: ShellNavItem;
  onNavigate?: (() => void) | undefined;
  variant: "dark" | "light";
}) {
  const pathname = usePathname();
  const Icon = icons[item.icon];
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-emerald-300/90 text-emerald-950 shadow-sm"
          : variant === "dark"
            ? "text-slate-300 hover:bg-white/10 hover:text-white"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      }`}
      href={item.href}
      {...(onNavigate ? { onClick: onNavigate } : {})}
    >
      <span
        className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition ${
          active ? "bg-emerald-700" : "bg-transparent"
        }`}
      />
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
      <ChevronRight className={`ml-auto h-4 w-4 transition ${active ? "opacity-70" : "opacity-0 group-hover:opacity-60"}`} />
    </Link>
  );
}
