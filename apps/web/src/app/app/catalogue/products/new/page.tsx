import { notFound } from "next/navigation";
import { getSession } from "@/lib/api";
import {
  fetchCatalogueLookups,
  getCataloguePermissions,
} from "@/lib/catalogue";
import { ProductForm } from "@/components/catalogue/product-form";

export default async function NewCatalogueProductPage() {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  if (!permissions.canManage) {
    return notFound();
  }

  const lookups = await fetchCatalogueLookups();
  return <ProductForm mode="create" lookups={lookups} />;
}
