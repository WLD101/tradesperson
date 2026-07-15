import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";

async function inviteUser(formData: FormData) {
  "use server";

  const session = await getSession();
  await apiFetch(`/api/v1/tenants/${session!.activeTenantId}/invitations`, {
    method: "POST",
    body: JSON.stringify({
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
    }),
  });

  revalidatePath("/app/settings/users");
}

export default async function UsersPage() {
  const session = await getSession();
  const members = await apiFetch<
    Array<{
      id: string;
      user: { email: string; firstName: string; lastName: string };
      status: string;
    }>
  >(`/api/v1/tenants/${session!.activeTenantId}/memberships`);
  const invitations = await apiFetch<
    Array<{ id: string; email: string; status: string; expiresAt: string }>
  >(`/api/v1/tenants/${session!.activeTenantId}/invitations`);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <h1 className="text-xl font-semibold text-slate-950">Team members</h1>
        <div className="mt-4 space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border border-slate-200 px-4 py-3"
            >
              <p className="font-medium text-slate-900">
                {member.user.firstName} {member.user.lastName}
              </p>
              <p className="text-sm text-slate-500">
                {member.user.email} • {member.status}
              </p>
            </div>
          ))}
        </div>
        <h2 className="mt-6 text-lg font-semibold text-slate-950">
          Pending invitations
        </h2>
        <div className="mt-4 space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="rounded-lg border border-slate-200 px-4 py-3"
            >
              <p className="font-medium text-slate-900">{invitation.email}</p>
              <p className="text-sm text-slate-500">
                {invitation.status} • Expires{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Invite user</h2>
        <form action={inviteUser} className="mt-4 space-y-3">
          <Input name="firstName" placeholder="First name" />
          <Input name="lastName" placeholder="Last name" />
          <Input name="email" placeholder="Email" required type="email" />
          <Button type="submit">Send invitation</Button>
        </form>
      </Card>
    </div>
  );
}
