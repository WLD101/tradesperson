"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@tradesperson/ui";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (formData: FormData) => {
    setError(null);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/auth/sign-in`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      },
    );

    if (!response.ok) {
      setError("Invalid credentials.");
      return;
    }

    router.push("/select-tenant");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md space-y-5">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Tradesperson.net ERP
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Sign in to your workspace
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use one of the seeded development accounts to access the Phase 1
            foundation.
          </p>
        </div>
        <form
          action={async (formData) => {
            await onSubmit(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <Input name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Input name="password" type="password" required />
          </div>
          <Button className="w-full" type="submit">
            Continue
          </Button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>
      </Card>
    </main>
  );
}
