import { Button, Card, Input } from "@tradesperson/ui";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

async function acceptInvitation(formData: FormData) {
  "use server";

  await fetch(
    `${process.env.API_URL ?? "http://localhost:4000"}/api/v1/invitations/accept`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: formData.get("token"),
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        password: formData.get("password"),
      }),
    },
  );
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  const response = await fetch(
    `${process.env.API_URL ?? "http://localhost:4000"}/api/v1/invitations/${token}`,
    { cache: "no-store" },
  );
  const payload = await response.json();
  const invitation = payload.data as
    { valid: boolean; email?: string; tenantName?: string } | undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">
            Accept invitation
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {invitation?.valid
              ? `Join ${invitation.tenantName} as ${invitation.email}.`
              : "This invitation is invalid or expired."}
          </p>
        </div>
        {invitation?.valid ? (
          <form action={acceptInvitation} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <Input name="firstName" placeholder="First name" required />
            <Input name="lastName" placeholder="Last name" required />
            <Input
              name="password"
              placeholder="Create password"
              required
              type="password"
            />
            <Button type="submit">Accept invitation</Button>
          </form>
        ) : null}
      </Card>
    </main>
  );
}
