import { getSession } from "@/lib/api";
import { fetchCatalogueLookups, getCataloguePermissions } from "@/lib/catalogue";
import { ReferenceManager } from "@/components/catalogue/reference-manager";

export default async function CatalogueManufacturersPage() {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  const { manufacturers } = await fetchCatalogueLookups();

  return (
    <ReferenceManager
      title="Manufacturers"
      description="Tenant-owned manufacturer records for flooring materials and accessories."
      apiBasePath="/api/v1/catalogue/manufacturers"
      records={manufacturers}
      canManage={permissions.canManage}
      canArchive={permissions.canArchive}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug", required: true },
        { key: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}
