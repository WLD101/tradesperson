import Link from "next/link";
import { Card } from "@tradesperson/ui";
import { getSession } from "@/lib/api";
import {
  fetchCatalogueLookups,
  getCataloguePermissions,
  type ProductListResponse,
} from "@/lib/catalogue";
import { apiFetch } from "@/lib/api";
import { ProductsTable } from "@/components/catalogue/products-table";

export default async function CatalogueProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) {
      query.set(key, value);
    }
  }

  const [{ categories, manufacturers, brands, collections, units }, response] =
    await Promise.all([
      fetchCatalogueLookups(),
      apiFetch<ProductListResponse>(`/api/v1/catalogue/products?${query.toString()}`),
    ]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Products</h1>
            <p className="mt-1 text-sm text-slate-500">
              Server-filtered catalogue products with tenant-safe pagination and sorting.
            </p>
          </div>
          {permissions.canManage ? (
            <Link
              href="/app/catalogue/products/new"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New product
            </Link>
          ) : null}
        </div>
        <form className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6" method="get">
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="search"
            defaultValue={typeof params.search === "string" ? params.search : ""}
            placeholder="Search by name or SKU"
          />
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="categoryId"
            defaultValue={typeof params.categoryId === "string" ? params.categoryId : ""}
          >
            <option value="">Category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="manufacturerId"
            defaultValue={
              typeof params.manufacturerId === "string" ? params.manufacturerId : ""
            }
          >
            <option value="">Manufacturer</option>
            {manufacturers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="brandId"
            defaultValue={typeof params.brandId === "string" ? params.brandId : ""}
          >
            <option value="">Brand</option>
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="collectionId"
            defaultValue={
              typeof params.collectionId === "string" ? params.collectionId : ""
            }
          >
            <option value="">Collection</option>
            {collections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="unitId"
            defaultValue={typeof params.unitId === "string" ? params.unitId : ""}
          >
            <option value="">Unit</option>
            {units.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="lifecycleStatus"
            defaultValue={
              typeof params.lifecycleStatus === "string"
                ? params.lifecycleStatus
                : ""
            }
          >
            <option value="">All active states</option>
            <option value="ACTIVE">Active</option>
            <option value="DISCONTINUED">Discontinued</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="sort"
            defaultValue={typeof params.sort === "string" ? params.sort : "updatedAtDesc"}
          >
            <option value="updatedAtDesc">Recently updated</option>
            <option value="createdAtDesc">Recently created</option>
            <option value="nameAsc">Name A-Z</option>
            <option value="nameDesc">Name Z-A</option>
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
            {response.total} products across {response.totalPages} pages
          </p>
          <p className="text-sm text-slate-500">
            Page {response.page} of {response.totalPages}
          </p>
        </div>
        <div className="mt-4">
          {response.items.length ? (
            <ProductsTable items={response.items} />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No products matched the current filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
