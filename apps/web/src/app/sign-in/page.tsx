import { Suspense } from "react";
import { AuthCard, IndustrialAuthShell } from "@/components/auth/industrial-auth-shell";
import { SignInClient } from "./sign-in-client";

export default function SignInPage() {
  return (
    <IndustrialAuthShell>
      <AuthCard eyebrow="Secure sign in" subtitle="Sign in to your workspace." title="Welcome back">
        <Suspense fallback={<div className="rounded-3xl bg-slate-50 p-6 text-sm font-bold text-slate-600">Loading secure sign in...</div>}>
          <SignInClient />
        </Suspense>
      </AuthCard>
    </IndustrialAuthShell>
  );
}
