"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { megaMenuSections, navItems } from "./site-data";
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
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#0f172a]/96 text-white backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        <Link className="flex min-w-0 items-center gap-3.5" href="/" aria-label="Tradesperson Network home">
          <Image alt="Tradesperson Network logo" className="rounded-2xl bg-white shadow-sm" height={48} src="/brand/tradesperson-erp-logo.png" width={48} />
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-[-0.03em] text-white">Tradesperson Network</p>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex" aria-label="Public navigation">
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
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-white/12 text-white" : "text-white/72 hover:bg-white/10 hover:text-white"
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
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-white/12 text-white" : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link className="rounded-xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/5 hover:text-white" href={publicLinks.signIn}>Sign In</Link>
          <Link className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10" href="/book-demo">Book a Demo</Link>
          <Link className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-300" href={publicLinks.startWorkspace}>
            Start Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          aria-expanded={openMobile}
          aria-label="Open menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 xl:hidden"
          onClick={() => setOpenMobile((value) => !value)}
          type="button"
        >
          {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {openMobile ? (
        <div className="border-t border-white/10 bg-[#0f172a] px-5 py-5 xl:hidden">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 max-w-sm text-sm leading-6 text-slate-300">
              Explore the network across platform, products, industries, community, and commercial entry points.
            </p>
            <div className="grid gap-2">
            {navItems.map((item) => (
              <Link key={item.href} className="rounded-2xl border border-white/10 px-4 py-4 text-sm font-bold transition hover:bg-white/5" href={item.href}>
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
            <div>
              <p className="font-black">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
