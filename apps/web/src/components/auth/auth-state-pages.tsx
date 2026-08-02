import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  MailCheck,
} from "lucide-react";
import {
  AuthCard,
  AuthPrimaryLink,
  AuthStateIllustration,
  IndustrialAuthShell,
  StatusRail,
} from "./industrial-auth-shell";

export function SignUpExperience() {
  return (
    <IndustrialAuthShell>
      <AuthCard eyebrow="Create workspace" subtitle="Start setup immediately after account creation." title="Build your flooring command centre">
        <form className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthInput label="Full Name" name="name" placeholder="Olivia Owner" />
            <AuthInput label="Business Email" name="email" placeholder="owner@example.com" type="email" />
          </div>
          <AuthInput label="Company Name" name="company" placeholder="Example Flooring Ltd" />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthInput label="Password" name="password" type="password" />
            <AuthInput label="Confirm Password" name="confirmPassword" type="password" />
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <StatusRail items={["14-day trial", "No credit card", "Setup in minutes"]} />
          </div>
          <label className="flex items-start gap-3 text-sm font-semibold text-slate-600">
            <input className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600" required type="checkbox" />
            I agree to receive setup messages and accept the workspace terms.
          </label>
          <AuthPrimaryLink href="/website/onboarding">Create Workspace</AuthPrimaryLink>
        </form>
      </AuthCard>
    </IndustrialAuthShell>
  );
}

export function ForgotPasswordExperience() {
  return (
    <IndustrialAuthShell headline="Recover secure access to your flooring workspace.">
      <AuthCard eyebrow="Password recovery" subtitle="Enter your work email and we will send a secure reset link when backend email delivery is enabled." title="Forgot password">
        <form className="space-y-4">
          <AuthInput label="Work Email" name="email" placeholder="owner@example.com" type="email" />
          <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-stitch-overlay" type="button">
            <MailCheck className="h-4 w-4" />
            Send Reset Link
          </button>
          <p className="text-center text-sm font-semibold text-slate-600">
            Remembered it? <Link className="font-black text-emerald-800" href="/sign-in">Back to Sign In</Link>
          </p>
        </form>
      </AuthCard>
    </IndustrialAuthShell>
  );
}

export function ResetPasswordExperience() {
  return (
    <IndustrialAuthShell headline="Set a stronger password before entering the ERP.">
      <AuthCard eyebrow="Reset password" subtitle="Choose a new password for your Tradesperson ERP account." title="Create new password">
        <form className="space-y-4">
          <AuthInput label="New Password" name="password" type="password" />
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-emerald-400" />
          </div>
          <p className="text-xs font-bold text-slate-500">Strength: good. Use at least 12 characters for production accounts.</p>
          <AuthInput label="Confirm Password" name="confirmPassword" type="password" />
          <AuthPrimaryLink href="/auth/success">Reset Password</AuthPrimaryLink>
        </form>
      </AuthCard>
    </IndustrialAuthShell>
  );
}

export function VerifyEmailExperience() {
  return (
    <IndustrialAuthShell headline="Verify your email before the workspace opens.">
      <AuthCard eyebrow="Email verification" subtitle="We sent a verification link to your work inbox." title="Verify email">
        <AuthStateIllustration />
        <div className="mt-6">
          <StatusRail items={["Email ownership confirmed", "Workspace access protected", "Audit trail ready"]} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <AuthPrimaryLink href="/auth/success">I Verified Email</AuthPrimaryLink>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-black text-slate-800" href="/sign-in">
            Back to Sign In
          </Link>
        </div>
      </AuthCard>
    </IndustrialAuthShell>
  );
}

export function EmailOtpExperience() {
  return (
    <IndustrialAuthShell headline="Use a one-time email code for secure access.">
      <AuthCard eyebrow="Email OTP" subtitle="A focused email-code flow with six digit entry, resend timing, and change-email controls." title="Enter secure code">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <AuthStateIllustration />
          <div className="mt-6 grid grid-cols-6 gap-2" aria-label="Six digit OTP">
            {Array.from({ length: 6 }).map((_, index) => (
              <input key={index} className="h-12 rounded-2xl border border-slate-300 bg-white text-center font-mono text-xl font-black" inputMode="numeric" maxLength={1} />
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between text-sm font-bold text-slate-600">
            <Link className="text-emerald-800" href="/sign-in">Change Email</Link>
            <span>Resend in 00:45</span>
          </div>
        </div>
      </AuthCard>
    </IndustrialAuthShell>
  );
}

export function OnboardingEntryExperience() {
  return (
    <IndustrialAuthShell headline="Your workspace is secure. Now finish setup.">
      <AuthCard eyebrow="Onboarding entry" subtitle="Estimated setup time: 5-10 minutes." title="Welcome to Tradesperson ERP">
        <StatusRail items={["Company", "Branch", "Team", "Products", "Suppliers", "Installers", "Branding", "Finish"]} />
        <div className="mt-6">
          <AuthPrimaryLink href="/app/onboarding">Start Setup</AuthPrimaryLink>
        </div>
      </AuthCard>
    </IndustrialAuthShell>
  );
}

export function SessionExpiredExperience() {
  return <StateExperience icon="expired" title="Session expired" eyebrow="Secure timeout" subtitle="Your session ended to protect workspace data." buttonHref="/sign-in?reason=expired" buttonLabel="Sign In Again" />;
}

export function AccountLockedExperience() {
  return <StateExperience icon="locked" title="Account locked" eyebrow="Access protected" subtitle="Too many failed attempts or an administrator lock is active." buttonHref="/sign-in?reason=locked" buttonLabel="Return to Sign In" />;
}

export function InvalidCredentialsExperience() {
  return <StateExperience icon="error" title="Invalid credentials" eyebrow="Sign in blocked" subtitle="The email and password combination did not match a workspace account." buttonHref="/sign-in" buttonLabel="Try Again" />;
}

export function EmailNotVerifiedExperience() {
  return <StateExperience icon="verify" title="Email not verified" eyebrow="Verification needed" subtitle="Verify your email address before continuing to your workspace." buttonHref="/verify-email" buttonLabel="Verify Email" />;
}

export function LoadingExperience() {
  return <StateExperience icon="loading" title="Opening workspace" eyebrow="Loading" subtitle="Preparing tenant, branch, permissions, and dashboard context." buttonHref="/select-tenant" buttonLabel="Continue" />;
}

export function SuccessExperience() {
  return <StateExperience icon="success" title="Email Verified" eyebrow="Workspace secure" subtitle="Workspace Secure. Ready to Continue." buttonHref="/onboarding-entry" buttonLabel="Continue to Workspace Setup" />;
}

export function ErrorExperience() {
  return <StateExperience icon="error" title="Something needs attention" eyebrow="Error state" subtitle="The authentication request could not be completed. Try again or contact your workspace owner." buttonHref="/sign-in" buttonLabel="Back to Sign In" />;
}

function StateExperience({
  icon,
  eyebrow,
  title,
  subtitle,
  buttonHref,
  buttonLabel,
}: {
  icon: "success" | "error" | "loading" | "locked" | "expired" | "verify";
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonHref: string;
  buttonLabel: string;
}) {
  const isPositive = icon === "success" || icon === "verify";
  const Icon = icon === "success" ? CheckCircle2 : icon === "loading" ? Loader2 : icon === "locked" ? LockKeyhole : icon === "expired" ? Clock3 : icon === "verify" ? MailCheck : AlertTriangle;
  return (
    <IndustrialAuthShell>
      <AuthCard eyebrow={eyebrow} subtitle={subtitle} title={title}>
        <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          <Icon className={`h-14 w-14 ${icon === "loading" ? "animate-spin" : ""}`} />
        </div>
        <div className="mt-7">
          <StatusRail
            items={
              isPositive
                ? ["Email Verified", "Workspace Secure", "Ready to Continue"]
                : ["No data was changed", "Workspace remains protected", "Next action is available"]
            }
          />
        </div>
        <div className="mt-6">
          <AuthPrimaryLink href={buttonHref}>{buttonLabel}</AuthPrimaryLink>
        </div>
      </AuthCard>
    </IndustrialAuthShell>
  );
}

export function TenantCreationExperience() {
  return (
    <IndustrialAuthShell headline="Create the tenant foundation for your flooring business.">
      <AuthCard eyebrow="Tenant creation" subtitle="Create the first business context before onboarding branches, products, suppliers, and installers." title="Create tenant">
        <form className="space-y-4">
          <AuthInput label="Business Name" name="name" placeholder="Example Flooring Ltd" />
          <AuthInput label="Workspace Slug" name="slug" placeholder="example-flooring" />
          <AuthInput label="Legal Name" name="legalName" placeholder="Example Flooring Limited" />
          <AuthPrimaryLink href="/onboarding-entry">Create Tenant</AuthPrimaryLink>
        </form>
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
