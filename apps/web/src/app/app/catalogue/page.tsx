import Link from "next/link";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import { getCataloguePermissions } from "@/lib/catalogue";

export default async function CataloguePage() {
  const session = await getSession();
  const { canManage } = getCataloguePermissions(session);
  const [products, categories, manufacturers, brands, collections] =
    await Promise.all([
      apiFetch<{ total: number }>("/api/v1/catalogue/products"),
      apiFetch<Array<{ id: string }>>("/api/v1/catalogue/categories"),
      apiFetch<Array<{ id: string }>>("/api/v1/catalogue/manufacturers"),
      apiFetch<Array<{ id: string }>>("/api/v1/catalogue/brands"),
      apiFetch<Array<{ id: string }>>("/api/v1/catalogue/collections"),
    ]);

  const sections = [
    ["Products", products.total, "/app/catalogue/products"],
    ["Categories", categories.length, "/app/catalogue/categories"],
    ["Manufacturers", manufacturers.length, "/app/catalogue/manufacturers"],
    ["Brands", brands.length, "/app/catalogue/brands"],
    ["Collections", collections.length, "/app/catalogue/collections"],
  ] as const;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Product catalogue
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tenant-owned flooring products, reference data, and variants.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/app/catalogue/products/new"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New product
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {sections.map(([label, count, href]) => (
          <Link href={href} key={href}>
            <Card className="h-full hover:border-slate-300 hover:bg-slate-50">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {count}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
