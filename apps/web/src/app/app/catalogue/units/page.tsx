import { getSession } from "@/lib/api";
import { fetchCatalogueLookups, getCataloguePermissions } from "@/lib/catalogue";
import { ReferenceManager } from "@/components/catalogue/reference-manager";

export default async function CatalogueUnitsPage() {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  const { units } = await fetchCatalogueLookups();

  return (
    <ReferenceManager
      title="Units"
      description="Units of measure used for rolls, packs, square metres, bags, tubs, and similar product handling."
      apiBasePath="/api/v1/catalogue/units"
      records={units}
      canManage={permissions.canManage}
      canArchive={permissions.canArchive}
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Fallback slug", required: true },
        { key: "symbol", label: "Symbol" },
        {
          key: "kind",
          label: "Kind",
          type: "select",
          options: [
            "EACH",
            "SQM",
            "LM",
            "ROLL",
            "PACK",
            "LITRE",
            "KG",
            "BAG",
            "TUB",
            "OTHER",
          ].map((value) => ({ value, label: value })),
        },
        { key: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}
