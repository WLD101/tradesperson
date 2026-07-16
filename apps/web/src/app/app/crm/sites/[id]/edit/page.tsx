"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@tradesperson/ui";
import { ClientApiError, clientApiFetch } from "@/lib/client-api";

type SiteRecord = {
  id: string;
  label: string;
  siteType: "RESIDENTIAL" | "COMMERCIAL" | "MIXED_USE" | "OTHER";
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  countryCode: string | null;
  accessNotes: string | null;
  occupancyStatus: "OCCUPIED" | "UNOCCUPIED" | "NEW_BUILD" | "UNDER_RENOVATION" | null;
  primaryContactName: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  floorLevel: string | null;
  hasLift: boolean | null;
  parkingNotes: string | null;
  workingHourNotes: string | null;
  asbestosConcern: boolean;
  dampConcern: boolean;
  generalSiteNotes: string | null;
  branch: { id: string; name: string } | null;
  customer: { id: string; displayName: string } | null;
};

type SiteFormState = {
  label: string;
  siteType: SiteRecord["siteType"];
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  countryCode: string;
  accessNotes: string;
  occupancyStatus: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  floorLevel: string;
  hasLift: boolean;
  parkingNotes: string;
  workingHourNotes: string;
  asbestosConcern: boolean;
  dampConcern: boolean;
  generalSiteNotes: string;
};

const defaultFormState: SiteFormState = {
  label: "",
  siteType: "RESIDENTIAL",
  addressLine1: "",
  addressLine2: "",
  city: "",
  county: "",
  postcode: "",
  countryCode: "GB",
  accessNotes: "",
  occupancyStatus: "",
  primaryContactName: "",
  primaryContactPhone: "",
  primaryContactEmail: "",
  floorLevel: "",
  hasLift: false,
  parkingNotes: "",
  workingHourNotes: "",
  asbestosConcern: false,
  dampConcern: false,
  generalSiteNotes: "",
};

function toFormState(site: SiteRecord): SiteFormState {
  return {
    label: site.label ?? "",
    siteType: site.siteType ?? "RESIDENTIAL",
    addressLine1: site.addressLine1 ?? "",
    addressLine2: site.addressLine2 ?? "",
    city: site.city ?? "",
    county: site.county ?? "",
    postcode: site.postcode ?? "",
    countryCode: site.countryCode ?? "GB",
    accessNotes: site.accessNotes ?? "",
    occupancyStatus: site.occupancyStatus ?? "",
    primaryContactName: site.primaryContactName ?? "",
    primaryContactPhone: site.primaryContactPhone ?? "",
    primaryContactEmail: site.primaryContactEmail ?? "",
    floorLevel: site.floorLevel ?? "",
    hasLift: Boolean(site.hasLift),
    parkingNotes: site.parkingNotes ?? "",
    workingHourNotes: site.workingHourNotes ?? "",
    asbestosConcern: Boolean(site.asbestosConcern),
    dampConcern: Boolean(site.dampConcern),
    generalSiteNotes: site.generalSiteNotes ?? "",
  };
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? "" : trimmed;
}

function formatError(error: unknown) {
  if (error instanceof ClientApiError) {
    if (error.status === 401) {
      return "Your session has expired. Sign in again and retry.";
    }
    if (error.status === 403) {
      return "You do not have permission to update this site.";
    }
    if (error.status === 404) {
      return "This site could not be found in your current tenant or branch scope.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export default function SiteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [siteId, setSiteId] = useState("");
  const [site, setSite] = useState<SiteRecord | null>(null);
  const [formState, setFormState] = useState<SiteFormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    params
      .then(async ({ id }) => {
        if (!active) {
          return;
        }

        setSiteId(id);
        setLoading(true);
        setError("");

        try {
          const record = await clientApiFetch<SiteRecord>(`/api/v1/sites/${id}`);
          if (!active) {
            return;
          }
          setSite(record);
          setFormState(toFormState(record));
        } catch (loadError) {
          if (active) {
            setError(formatError(loadError));
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to resolve the site identifier.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteId) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await clientApiFetch(`/api/v1/sites/${siteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: formState.label.trim(),
          siteType: formState.siteType,
          addressLine1: cleanOptionalText(formState.addressLine1),
          addressLine2: cleanOptionalText(formState.addressLine2),
          city: cleanOptionalText(formState.city),
          county: cleanOptionalText(formState.county),
          postcode: cleanOptionalText(formState.postcode),
          countryCode: formState.countryCode.trim().toUpperCase() || "GB",
          accessNotes: cleanOptionalText(formState.accessNotes),
          ...(formState.occupancyStatus
            ? { occupancyStatus: formState.occupancyStatus }
            : {}),
          primaryContactName: cleanOptionalText(formState.primaryContactName),
          primaryContactPhone: cleanOptionalText(formState.primaryContactPhone),
          primaryContactEmail: cleanOptionalText(formState.primaryContactEmail),
          floorLevel: cleanOptionalText(formState.floorLevel),
          hasLift: formState.hasLift,
          parkingNotes: cleanOptionalText(formState.parkingNotes),
          workingHourNotes: cleanOptionalText(formState.workingHourNotes),
          asbestosConcern: formState.asbestosConcern,
          dampConcern: formState.dampConcern,
          generalSiteNotes: cleanOptionalText(formState.generalSiteNotes),
        }),
      });

      setSuccessMessage("Site details saved.");
      router.refresh();
      setTimeout(() => {
        router.push(`/app/crm/sites/${siteId}`);
      }, 500);
    } catch (saveError) {
      setError(formatError(saveError));
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof SiteFormState>(key: K, value: SiteFormState[K]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-500">Loading site details...</div>;
  }

  if (!site) {
    return (
      <div className="space-y-4">
        <Link
          href="/app/crm/sites"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Back to Sites
        </Link>
        <Card>
          <p className="text-sm text-rose-700">{error || "The site could not be loaded."}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/app/crm/sites/${site.id}`}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Back to Site
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Edit Site</h1>
          <p className="mt-1 text-sm text-slate-500">
            Update operational site details while keeping customer and branch ownership fixed.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Ownership</h2>
          <p className="mt-1 text-sm text-slate-500">
            Customer and branch stay immutable on this screen to preserve auditability and survey links.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                {site.customer?.displayName ?? "Unassigned"}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Branch
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                {site.branch?.name ?? "Tenant default branch"}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Site Id
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                {site.id}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Site label</label>
              <Input
                value={formState.label}
                onChange={(event) => updateField("label", event.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Site type</label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                value={formState.siteType}
                onChange={(event) => updateField("siteType", event.target.value as SiteRecord["siteType"])}
              >
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="MIXED_USE">Mixed use</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Occupancy</label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                value={formState.occupancyStatus}
                onChange={(event) => updateField("occupancyStatus", event.target.value)}
              >
                <option value="">Not set</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="UNOCCUPIED">Unoccupied</option>
                <option value="NEW_BUILD">New build</option>
                <option value="UNDER_RENOVATION">Under renovation</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address line 1</label>
              <Input
                value={formState.addressLine1}
                onChange={(event) => updateField("addressLine1", event.target.value)}
                placeholder="14 Birch Avenue"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address line 2</label>
              <Input
                value={formState.addressLine2}
                onChange={(event) => updateField("addressLine2", event.target.value)}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Town or city</label>
              <Input
                value={formState.city}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">County</label>
              <Input
                value={formState.county}
                onChange={(event) => updateField("county", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Postcode</label>
              <Input
                value={formState.postcode}
                onChange={(event) => updateField("postcode", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Country code</label>
              <Input
                maxLength={2}
                value={formState.countryCode}
                onChange={(event) => updateField("countryCode", event.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Primary contact</label>
              <Input
                value={formState.primaryContactName}
                onChange={(event) => updateField("primaryContactName", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Primary phone</label>
              <Input
                value={formState.primaryContactPhone}
                onChange={(event) => updateField("primaryContactPhone", event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Primary email</label>
              <Input
                type="email"
                value={formState.primaryContactEmail}
                onChange={(event) => updateField("primaryContactEmail", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Floor level</label>
              <Input
                value={formState.floorLevel}
                onChange={(event) => updateField("floorLevel", event.target.value)}
                placeholder="Ground, First, Mezzanine"
              />
            </div>

            <div className="flex items-center gap-3 pt-7">
              <input
                id="hasLift"
                type="checkbox"
                checked={formState.hasLift}
                onChange={(event) => updateField("hasLift", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <label htmlFor="hasLift" className="text-sm font-medium text-slate-700">
                Lift access available
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="asbestosConcern"
                type="checkbox"
                checked={formState.asbestosConcern}
                onChange={(event) => updateField("asbestosConcern", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <label htmlFor="asbestosConcern" className="text-sm font-medium text-slate-700">
                Asbestos concern noted
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="dampConcern"
                type="checkbox"
                checked={formState.dampConcern}
                onChange={(event) => updateField("dampConcern", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <label htmlFor="dampConcern" className="text-sm font-medium text-slate-700">
                Damp concern noted
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Access notes</label>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                value={formState.accessNotes}
                onChange={(event) => updateField("accessNotes", event.target.value)}
                placeholder="Keys, parking, gate codes, pets, access windows"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Parking notes</label>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                value={formState.parkingNotes}
                onChange={(event) => updateField("parkingNotes", event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Working hour notes</label>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                value={formState.workingHourNotes}
                onChange={(event) => updateField("workingHourNotes", event.target.value)}
                placeholder="Restricted hours, noise windows, caretaker sign-off"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">General site notes</label>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                value={formState.generalSiteNotes}
                onChange={(event) => updateField("generalSiteNotes", event.target.value)}
                placeholder="Any survey, prep, or installation notes the team should carry forward"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Link
                href={`/app/crm/sites/${site.id}`}
                className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save site"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
