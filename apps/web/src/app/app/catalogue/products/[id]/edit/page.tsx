import { notFound } from "next/navigation";
import { getSession } from "@/lib/api";
import {
  fetchCatalogueLookups,
  getCataloguePermissions,
  type ProductDetail,
} from "@/lib/catalogue";
import { apiFetch } from "@/lib/api";
import { ProductForm } from "@/components/catalogue/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  if (!permissions.canManage) {
    return notFound();
  }

  const { id } = await params;
  const [lookups, product] = await Promise.all([
    fetchCatalogueLookups(),
    apiFetch<ProductDetail>(`/api/v1/catalogue/products/${id}`),
  ]);

  return <ProductForm mode="edit" product={product} lookups={lookups} />;
}
