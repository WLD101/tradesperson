import { notFound } from "next/navigation";
import { getSession } from "@/lib/api";
import { getSupplierPermissions } from "@/lib/suppliers";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function NewSupplierPage() {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  if (!permissions.canManage) {
    return notFound();
  }

  return <SupplierForm mode="create" />;
}
