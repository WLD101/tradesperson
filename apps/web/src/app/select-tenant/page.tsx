import { SelectTenantClient } from "./select-tenant-client";
import { getSession } from "@/lib/api";

export default async function SelectTenantPage() {
  const session = await getSession();
  return <SelectTenantClient memberships={session?.memberships ?? []} />;
}
