import Link from "next/link";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import {
  getSupplierPermissions,
  type SupplierListResponse,
} from "@/lib/suppliers";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) {
      query.set(key, value);
    }
  }

  const response = await apiFetch<SupplierListResponse>(
    `/api/v1/suppliers?${query.toString()}`,
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Suppliers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tenant-safe supplier records and product relationships. Price lists remain Phase C.
            </p>
          </div>
          {permissions.canManage ? (
            <Link
              href="/app/suppliers/new"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New supplier
            </Link>
          ) : null}
        </div>
        <form className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6" method="get">
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="search"
            defaultValue={typeof params.search === "string" ? params.search : ""}
            placeholder="Search by name, code, account or postcode"
          />
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="status"
            defaultValue={typeof params.status === "string" ? params.status : ""}
          >
            <option value="">Active and inactive</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="preferred"
            defaultValue={typeof params.preferred === "string" ? params.preferred : ""}
          >
            <option value="">All suppliers</option>
            <option value="true">Preferred only</option>
            <option value="false">Non-preferred only</option>
          </select>
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="countryCode"
            defaultValue={
              typeof params.countryCode === "string" ? params.countryCode : ""
            }
            placeholder="Country code"
          />
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="sort"
            defaultValue={typeof params.sort === "string" ? params.sort : "updatedAtDesc"}
          >
            <option value="updatedAtDesc">Recently updated</option>
            <option value="createdAtDesc">Recently created</option>
            <option value="nameAsc">Name A-Z</option>
            <option value="nameDesc">Name Z-A</option>
            <option value="leadTimeAsc">Lead time</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply filters
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {response.total} suppliers across {response.totalPages} pages
          </p>
          <p className="text-sm text-slate-500">
            Page {response.page} of {response.totalPages}
          </p>
        </div>
        <div className="mt-4">
          {response.items.length ? (
            <SuppliersTable items={response.items} />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No suppliers matched the current filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
