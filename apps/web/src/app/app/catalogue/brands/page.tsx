import { getSession } from "@/lib/api";
import { fetchCatalogueLookups, getCataloguePermissions } from "@/lib/catalogue";
import { ReferenceManager } from "@/components/catalogue/reference-manager";

export default async function CatalogueBrandsPage() {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  const { brands, manufacturers } = await fetchCatalogueLookups();

  return (
    <ReferenceManager
      title="Brands"
      description="Brand records that remain tenant-owned and safe within the current tenant scope."
      apiBasePath="/api/v1/catalogue/brands"
      records={brands}
      canManage={permissions.canManage}
      canArchive={permissions.canArchive}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug", required: true },
        {
          key: "manufacturerId",
          label: "Manufacturer",
          type: "select",
          options: manufacturers.map((item) => ({
            value: item.id,
            label: item.name,
          })),
        },
        { key: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}
