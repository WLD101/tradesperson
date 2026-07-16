import { notFound } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getSupplierPermissions, type SupplierDetail } from "@/lib/suppliers";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  if (!permissions.canManage) {
    return notFound();
  }

  const { id } = await params;
  const supplier = await apiFetch<SupplierDetail>(`/api/v1/suppliers/${id}`);
  return <SupplierForm mode="edit" supplier={supplier} />;
}
