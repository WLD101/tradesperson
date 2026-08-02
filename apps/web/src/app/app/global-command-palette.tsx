"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { clientApiFetch } from "@/lib/client-api";

type SearchResult = {
  id: string;
  type: string;
  label: string;
  title: string;
  detail: string;
  status?: string;
  branch?: string | null;
  href: string;
};

type SearchCommand = {
  id: string;
  label: string;
  href: string;
};

type SearchResponse = {
  query: string;
  minQueryLength: number;
  results: SearchResult[];
  commands: SearchCommand[];
};

type PaletteItem =
  | ({ kind: "result" } & SearchResult)
  | ({ kind: "command" } & SearchCommand);

const groupLabels: Record<string, string> = {
  customers: "Customers",
  leads: "Leads",
  sites: "Sites",
  surveys: "Surveys",
  estimates: "Estimates",
  quotes: "Quotes",
  jobs: "Jobs",
  invoices: "Invoices",
  products: "Products",
  suppliers: "Suppliers",
  purchaseOrders: "Purchase orders",
};

export function GlobalCommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (paletteRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        const response = await clientApiFetch<SearchResponse>(`/api/v1/search?${params.toString()}`, {
          signal: controller.signal,
        });
        setData(response);
        setSelectedIndex(0);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Search failed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const commands = data?.commands ?? [];
  const results = query.trim().length >= (data?.minQueryLength ?? 2) ? data?.results ?? [] : [];
  const showResultsFirst = results.length > 0;
  const items: PaletteItem[] = [
    ...(showResultsFirst ? results.map((item) => ({ ...item, kind: "result" as const })) : []),
    ...commands.map((item) => ({ ...item, kind: "command" as const })),
    ...(!showResultsFirst ? results.map((item) => ({ ...item, kind: "result" as const })) : []),
  ];

  const openItem = (item: PaletteItem) => {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((value) => Math.min(value + 1, Math.max(items.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter" && items[selectedIndex]) {
      event.preventDefault();
      openItem(items[selectedIndex]);
    }
  };

  return (
    <>
      <button
        className="hidden min-w-72 max-w-lg flex-1 items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 md:flex"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2"><Search size={16} /> Search anything...</span>
        <kbd className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-500">Ctrl K</kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            ref={paletteRef}
            aria-modal="true"
            className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-stitch-overlay"
            role="dialog"
            onMouseDown={(event) => {
              const target = event.target;
              if (target instanceof HTMLElement && target.closest("input, button, a")) {
                event.stopPropagation();
              }
            }}
          >
            <div className="border-b border-slate-200 p-4">
              <label className="sr-only" htmlFor="global-search-input">Search the ERP</label>
              <div className="flex items-center gap-3">
                <Search className="text-slate-400" size={20} />
                <input
                  ref={inputRef}
                  id="global-search-input"
                  className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
                  placeholder="Search customers, jobs, invoices, products..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                />
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              {loading ? <p className="px-3 py-6 text-sm text-slate-500">Searching...</p> : null}
              {error ? <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">{error}</p> : null}
              {!loading && !error && query.trim().length > 0 && query.trim().length < (data?.minQueryLength ?? 2) ? (
                <p className="px-3 py-6 text-sm text-slate-500">Type at least 2 characters to search records.</p>
              ) : null}
              {!loading && !error && results.length === 0 && query.trim().length >= (data?.minQueryLength ?? 2) ? (
                <p className="px-3 py-6 text-sm text-slate-500">No matching records found.</p>
              ) : null}
              {Object.entries(groupByType(results)).map(([type, group]) => {
                const offset = results.findIndex((item) => item.type === type);
                return <PaletteGroup key={type} title={groupLabels[type] ?? type} items={group.map((item) => ({ ...item, kind: "result" as const }))} selectedIndex={selectedIndex} startIndex={offset} onOpen={openItem} />;
              })}
              {commands.length ? <PaletteGroup title="Quick commands" items={commands.map((item) => ({ ...item, kind: "command" as const }))} selectedIndex={selectedIndex} startIndex={results.length} onOpen={openItem} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function groupByType(results: SearchResult[]) {
  return results.reduce<Record<string, SearchResult[]>>((groups, item) => {
    const group = groups[item.type] ?? [];
    group.push(item);
    groups[item.type] = group;
    return groups;
  }, {});
}

function PaletteGroup({
  title,
  items,
  selectedIndex,
  startIndex,
  onOpen,
}: {
  title: string;
  items: PaletteItem[];
  selectedIndex: number;
  startIndex: number;
  onOpen: (item: PaletteItem) => void;
}) {
  return (
    <section className="mb-3">
      <h3 className="px-3 py-2 text-label-caps uppercase text-slate-500">{title}</h3>
      <div className="space-y-1">
        {items.map((item, index) => {
          const absoluteIndex = startIndex + index;
          const selected = selectedIndex === absoluteIndex;
          return (
            <button
              key={`${item.kind}-${item.id}`}
              className={`w-full rounded-xl px-3 py-3 text-left transition ${selected ? "bg-emerald-50 ring-2 ring-emerald-300" : "hover:bg-slate-50"}`}
              type="button"
              onMouseEnter={() => undefined}
              onClick={() => onOpen(item)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.kind === "command" ? item.label : `${item.label}: ${item.title}`}</p>
                  {item.kind === "result" ? <p className="mt-1 text-xs text-slate-500">{item.detail}{item.branch ? ` | ${item.branch}` : ""}</p> : <p className="mt-1 text-xs text-slate-500">Open {item.href}</p>}
                </div>
                {item.kind === "result" && item.status ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{item.status}</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
