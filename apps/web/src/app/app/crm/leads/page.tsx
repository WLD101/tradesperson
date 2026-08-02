import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Filter, Search, UserPlus } from "lucide-react";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";
import { EmptyState, StatusBadge } from "@/components/shared";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  city: string | null;
  postcode: string | null;
  createdAt: string;
  convertedCustomer: { id: string; displayName: string } | null;
  convertedProperty: { id: string; label: string } | null;
};

async function createLead(formData: FormData) {
  "use server";

  await apiFetch("/api/v1/leads", {
    method: "POST",
    body: JSON.stringify({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      companyName: formData.get("companyName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      source: formData.get("source"),
      addressLine1: formData.get("addressLine1"),
      city: formData.get("city"),
      postcode: formData.get("postcode"),
      notes: formData.get("notes"),
    }),
  });

  revalidatePath("/app/crm/leads");
  revalidatePath("/app/dashboard");
}

async function convertLead(formData: FormData) {
  "use server";

  const leadId = String(formData.get("leadId"));
  await apiFetch(`/api/v1/leads/${leadId}/convert`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  revalidatePath("/app/crm/leads");
  revalidatePath("/app/crm/customers");
  revalidatePath("/app/crm/properties");
  revalidatePath("/app/crm/sites");
  revalidatePath("/app/dashboard");
}

function leadName(lead: Lead) {
  return lead.companyName ?? `${lead.firstName} ${lead.lastName}`.trim();
}

function leadAgeDays(lead: Lead) {
  const ageMs = Date.now() - new Date(lead.createdAt).getTime();
  return Math.max(0, Math.floor(ageMs / 86_400_000));
}

function leadStatusColor(status: string) {
  if (["CONVERTED", "WON"].includes(status)) return "green" as const;
  if (["LOST", "CANCELLED"].includes(status)) return "red" as const;
  if (["QUALIFIED", "SURVEY_BOOKED", "ESTIMATE_SENT"].includes(status)) return "blue" as const;
  return "slate" as const;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; source?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const leads = await apiFetch<Lead[]>("/api/v1/leads");
  const query = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "";
  const source = params.source ?? "";

  const statuses = Array.from(new Set(leads.map((lead) => lead.status))).sort();
  const sources = Array.from(new Set(leads.map((lead) => lead.source).filter(Boolean) as string[])).sort();
  const filteredLeads = leads.filter((lead) => {
    const haystack = [leadName(lead), lead.email, lead.phone, lead.city, lead.postcode, lead.source, lead.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (!query || haystack.includes(query)) && (!status || lead.status === status) && (!source || lead.source === source);
  });

  const newLeads = leads.filter((lead) => !lead.convertedCustomer).length;
  const convertedLeads = leads.filter((lead) => lead.convertedCustomer).length;
  const staleLeads = leads.filter((lead) => !lead.convertedCustomer && leadAgeDays(lead) >= 5).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-label-caps uppercase text-emerald-700">CRM intake</p>
            <h1 className="mt-2 text-headline-lg text-slate-950">Lead Pipeline</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Track enquiries from first contact through customer conversion, site creation, survey booking, and estimate handoff.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:min-w-[26rem]">
            <Metric label="Open" value={newLeads} />
            <Metric label="Converted" value={convertedLeads} />
            <Metric label="Stale" value={staleLeads} tone={staleLeads ? "red" : "green"} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden p-0">
          <form className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center" action="/app/crm/leads">
            <label className="relative flex-1">
              <span className="sr-only">Search leads</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" defaultValue={params.q ?? ""} name="q" placeholder="Search enterprise records..." />
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <Filter className="h-4 w-4" />
              <span className="sr-only">Lead status</span>
              <select className="bg-transparent text-sm outline-none" defaultValue={status} name="status">
                <option value="">All statuses</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <span className="sr-only">Lead source</span>
              <select className="bg-transparent text-sm outline-none" defaultValue={source} name="source">
                <option value="">All sources</option>
                {sources.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <Button type="submit">Apply</Button>
          </form>

          <div className="divide-y divide-slate-100">
            {filteredLeads.map((lead) => {
              const ageDays = leadAgeDays(lead);
              const stale = !lead.convertedCustomer && ageDays >= 5;
              return (
                <article key={lead.id} className="group px-5 py-4 transition hover:bg-slate-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-950">{leadName(lead)}</h2>
                        <StatusBadge status={lead.status} color={leadStatusColor(lead.status)} />
                        {stale ? <StatusBadge status="Stale" color="red" /> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {lead.email ?? "No email"} · {lead.phone ?? "No phone"} · {[lead.city, lead.postcode].filter(Boolean).join(", ") || "No address yet"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono">
                          <Clock3 className="h-3.5 w-3.5" /> {ageDays}d old
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          Source: {lead.source ?? "Unknown"}
                        </span>
                        {lead.convertedProperty ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                            <CalendarDays className="h-3.5 w-3.5" /> Survey ready
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {lead.convertedCustomer ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" /> {lead.convertedCustomer.displayName}
                          </span>
                          {lead.convertedProperty ? (
                            <>
                              <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50" href={`/app/crm/sites/${lead.convertedProperty.id}`}>
                                Open site
                              </Link>
                              <Link className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800" href={`/app/crm/surveys/new?siteId=${lead.convertedProperty.id}`}>
                                Create survey
                              </Link>
                            </>
                          ) : (
                            <span className="text-sm text-slate-500">Site pending</span>
                          )}
                        </>
                      ) : (
                        <form action={convertLead}>
                          <input name="leadId" type="hidden" value={lead.id} />
                          <Button className="gap-2" type="submit">Convert <ArrowRight className="h-4 w-4" /></Button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!filteredLeads.length ? (
            <div className="p-5">
              <EmptyState title="No matching leads" description="Adjust search or filters, or add a new lead from the intake panel." />
            </div>
          ) : null}
        </Card>

        <Card className="h-fit">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-title-md text-slate-950">Add lead</h2>
              <p className="text-sm text-slate-500">Fast intake for enquiries and showroom opportunities.</p>
            </div>
          </div>
          <form action={createLead} className="mt-5 space-y-3">
            <Input name="firstName" placeholder="First name" required />
            <Input name="lastName" placeholder="Last name" required />
            <Input name="companyName" placeholder="Company name (optional)" />
            <Input name="email" placeholder="Email" type="email" />
            <Input name="phone" placeholder="Phone" />
            <Input name="source" placeholder="Source" />
            <Input name="addressLine1" placeholder="Address line 1" />
            <Input name="city" placeholder="City" />
            <Input name="postcode" placeholder="Postcode" />
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              name="notes"
              placeholder="Notes"
            />
            <Button className="w-full" type="submit">Create lead</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "green" | "red" }) {
  const toneClass = tone === "red" ? "text-red-700" : tone === "green" ? "text-emerald-700" : "text-slate-950";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-label-caps uppercase text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
