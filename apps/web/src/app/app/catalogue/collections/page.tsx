import { getSession } from "@/lib/api";
import { fetchCatalogueLookups, getCataloguePermissions } from "@/lib/catalogue";
import { ReferenceManager } from "@/components/catalogue/reference-manager";

export default async function CatalogueCollectionsPage() {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  const { collections, manufacturers, brands } = await fetchCatalogueLookups();

  return (
    <ReferenceManager
      title="Collections"
      description="Collections that group flooring ranges beneath manufacturers and brands."
      apiBasePath="/api/v1/catalogue/collections"
      records={collections}
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
        {
          key: "brandId",
          label: "Brand",
          type: "select",
          options: brands.map((item) => ({
            value: item.id,
            label: item.name,
          })),
        },
        { key: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}
