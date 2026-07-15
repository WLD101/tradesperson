import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

async function createBranch(formData: FormData) {
  "use server";

  await apiFetch("/api/v1/branches", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      branchCode: formData.get("branchCode"),
      type: formData.get("type"),
      city: formData.get("city"),
      postcode: formData.get("postcode"),
    }),
  });

  revalidatePath("/app/settings/branches");
}

export default async function BranchesPage() {
  const branches = await apiFetch<
    Array<{
      id: string;
      name: string;
      branchCode: string;
      type: string;
      city?: string | null;
    }>
  >("/api/v1/branches");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <h1 className="text-xl font-semibold text-slate-950">Branches</h1>
        <div className="mt-4 space-y-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-lg border border-slate-200 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{branch.name}</p>
                  <p className="text-sm text-slate-500">
                    {branch.branchCode} • {branch.type}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {branch.city ?? "No city"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Create branch</h2>
        <form action={createBranch} className="mt-4 space-y-3">
          <Input name="name" placeholder="Branch name" required />
          <Input name="branchCode" placeholder="Branch code" required />
          <Input name="type" placeholder="HEAD_OFFICE" required />
          <Input name="city" placeholder="City" />
          <Input name="postcode" placeholder="Postcode" />
          <Button type="submit">Create branch</Button>
        </form>
      </Card>
    </div>
  );
}
