import { getSession } from "@/lib/api";
import { fetchCatalogueLookups, getCataloguePermissions } from "@/lib/catalogue";
import { ReferenceManager } from "@/components/catalogue/reference-manager";

export default async function CatalogueCategoriesPage() {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  const { categories } = await fetchCatalogueLookups();

  return (
    <ReferenceManager
      title="Categories"
      description="Operational flooring categories used to classify tenant-owned products."
      apiBasePath="/api/v1/catalogue/categories"
      records={categories}
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
