import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, UserPlus } from "lucide-react";
import { AuthCard, IndustrialAuthShell, StatusRail } from "@/components/auth/industrial-auth-shell";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

async function acceptInvitation(formData: FormData) {
  "use server";

  const response = await fetch(
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

  if (response.ok) {
    redirect("/auth/success");
  }

  redirect("/auth/error");
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
    <IndustrialAuthShell headline="Accept your invite into a secure flooring operations workspace.">
      <AuthCard
        eyebrow="Invitation acceptance"
        subtitle={
          invitation?.valid
            ? `Join ${invitation.tenantName} as ${invitation.email}.`
            : "This invitation is invalid or expired."
        }
        title={invitation?.valid ? "Join workspace" : "Invitation unavailable"}
      >
        {invitation?.valid ? (
          <form action={acceptInvitation} className="space-y-4">
            <input name="token" type="hidden" value={token} />
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700">
                  <UserPlus className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">{invitation.tenantName}</p>
                  <p className="text-xs font-bold text-slate-600">Role and permissions activate after password setup.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthInput label="First Name" name="firstName" placeholder="Olivia" />
              <AuthInput label="Last Name" name="lastName" placeholder="Owner" />
            </div>
            <AuthInput label="Create Password" name="password" type="password" />
            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-stitch-overlay" type="submit">
              <CheckCircle2 className="h-4 w-4" />
              Accept invitation
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <StatusRail items={["No workspace access was granted", "Ask the owner for a new invite", "Expired links remain blocked"]} />
            <Link className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white" href="/sign-in">
              Back to Sign In
            </Link>
          </div>
        )}
      </AuthCard>
    </IndustrialAuthShell>
  );
}

function AuthInput({
  label,
  name,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)] focus:outline-none"
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}
