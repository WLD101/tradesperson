"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { megaMenuSections, navItems } from "./site-data";
import type { Availability } from "./site-data";
import { publicLinks } from "./site-links";

type HeaderMenuKey = keyof typeof megaMenuSections | null;

export function PublicHeader() {
  const pathname = usePathname();
  const [openMobile, setOpenMobile] = useState(false);
  const [openMega, setOpenMega] = useState<HeaderMenuKey>(null);

  useEffect(() => {
    setOpenMobile(false);
    setOpenMega(null);
  }, [pathname]);

  useEffect(() => {
    if (!openMobile) return undefined;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMobile(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [openMobile]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/10 bg-[#0f172a]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link className="flex items-center gap-3" href="/" aria-label="Tradesperson Network home">
          <Image alt="Tradesperson Network logo" className="rounded-xl bg-white" height={42} src="/brand/tradesperson-erp-logo.png" width={42} />
          <div>
            <p className="text-base font-black tracking-tight">Tradesperson Network</p>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">The digital world for trades</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Public navigation">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const megaKey = getMegaKey(item.href);
            return megaKey ? (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => setOpenMega(megaKey)}
                onMouseLeave={() => setOpenMega((current) => (current === megaKey ? null : current))}
              >
                <button
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold transition ${
                    active ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                  onFocus={() => setOpenMega(megaKey)}
                  onClick={() => setOpenMega((current) => (current === megaKey ? null : megaKey))}
                  type="button"
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {openMega === megaKey ? <MegaMenu menuKey={megaKey} /> : null}
              </div>
            ) : (
              <Link
                key={item.href}
                className={`rounded-full px-3 py-2 text-sm font-bold transition ${
                  active ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link className="text-sm font-bold text-white/80 hover:text-white" href={publicLinks.signIn}>Sign In</Link>
          <Link className="rounded-xl border border-white/20 px-4 py-2 text-sm font-black text-white hover:bg-white/10" href="/book-demo">Book a Demo</Link>
          <Link className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-300" href={publicLinks.startWorkspace}>Start Workspace</Link>
        </div>

        <button
          aria-expanded={openMobile}
          aria-label="Open menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 xl:hidden"
          onClick={() => setOpenMobile((value) => !value)}
          type="button"
        >
          {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {openMobile ? (
        <div className="border-t border-white/10 bg-[#0f172a] px-5 py-5 xl:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <Link key={item.href} className="rounded-2xl border border-white/10 px-4 py-4 text-sm font-bold hover:bg-white/5" href={item.href}>
                <span className="block">{item.label}</span>
                {item.description ? <span className="mt-1 block text-xs font-medium text-white/65">{item.description}</span> : null}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">
            <Link className="rounded-2xl border border-white/10 px-4 py-4 text-sm font-bold" href={publicLinks.signIn}>Sign In</Link>
            <Link className="rounded-2xl border border-white/10 px-4 py-4 text-sm font-bold" href="/book-demo">Book a Demo</Link>
            <Link className="rounded-2xl bg-emerald-400 px-4 py-4 text-sm font-black text-slate-950" href={publicLinks.startWorkspace}>Start Workspace</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function getMegaKey(href: string): HeaderMenuKey {
  if (href === "/platform") return "platform";
  if (href === "/products") return "products";
  if (href === "/solutions") return "solutions";
  return null;
}

function MegaMenu({ menuKey }: { menuKey: Exclude<HeaderMenuKey, null> }) {
  const cards = megaMenuSections[menuKey];
  return (
    <div className="absolute left-1/2 top-full mt-3 w-[760px] -translate-x-1/2 rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-stitch-overlay">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((item) => (
          <Link key={item.href + item.label} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40" href={item.href}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
              {"status" in item && item.status ? <LocalStatusBadge status={item.status as Availability} /> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LocalStatusBadge({ status }: { status: Availability }) {
  const styles: Record<Availability, string> = {
    Available: "bg-emerald-100 text-emerald-900 border-emerald-200",
    Beta: "bg-sky-100 text-sky-900 border-sky-200",
    "In Development": "bg-amber-100 text-amber-900 border-amber-200",
    Planned: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${styles[status]}`}>{status}</span>;
}
