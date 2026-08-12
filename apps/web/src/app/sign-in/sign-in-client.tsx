"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";

export function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReason = searchParams.get("reason");
  const [activeTab, setActiveTab] = useState<"password" | "otp">("password");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [error, setError] = useState<string | null>(
    initialReason === "expired"
      ? "Your session expired. Sign in again to continue securely."
      : initialReason === "locked"
        ? "This account is locked. Contact your workspace owner."
        : initialReason === "verify-email"
          ? "Please verify your email before entering the ERP."
          : null,
  );
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/auth/sign-in", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: formData.get("email"),
            password: formData.get("password"),
          }),
        });

        if (!response.ok) {
          setError("Invalid credentials. Check your email and password, then try again.");
          return;
        }

        router.refresh();
        router.push("/select-tenant");
      } catch {
        setError("Sign-in service is not reachable. Start the API preview, then try again.");
        return;
      }
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm font-black text-slate-600">
        <button
          className={`rounded-xl px-4 py-3 transition ${activeTab === "password" ? "bg-white text-slate-950 shadow-stitch" : "hover:text-slate-950"}`}
          onClick={() => setActiveTab("password")}
          type="button"
        >
          Password Login
        </button>
        <button
          className={`rounded-xl px-4 py-3 transition ${activeTab === "otp" ? "bg-white text-slate-950 shadow-stitch" : "hover:text-slate-950"}`}
          onClick={() => setActiveTab("otp")}
          type="button"
        >
          Email OTP
        </button>
      </div>

      {activeTab === "password" ? (
        <form
          action={(formData) => {
            onSubmit(formData);
          }}
          className="mt-6 space-y-4"
        >
          <label className="space-y-2 text-sm font-bold text-slate-700">
            Email
            <input
              autoComplete="email"
              className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)] focus:outline-none"
              name="email"
              placeholder="owner@example.com"
              required
              type="email"
            />
          </label>
          <label className="space-y-2 text-sm font-bold text-slate-700">
            Password
            <span className="relative block">
              <input
                autoComplete="current-password"
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 pr-12 text-sm font-semibold text-slate-950 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)] focus:outline-none"
                name="password"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 font-semibold text-slate-600">
              <input className="h-4 w-4 rounded border-slate-300 text-emerald-600" name="remember" type="checkbox" />
              Remember me
            </label>
            <Link className="font-black text-emerald-800 hover:text-emerald-700" href="/forgot-password">
              Forgot Password
            </Link>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-stitch-overlay transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Sign In
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          {!otpSent ? (
            <>
              <label className="space-y-2 text-sm font-bold text-slate-700">
                Work email
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)] focus:outline-none"
                  onChange={(event) => setOtpEmail(event.target.value)}
                  placeholder="owner@example.com"
                  type="email"
                  value={otpEmail}
                />
              </label>
              <button
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-200"
                onClick={() => setOtpSent(true)}
                type="button"
              >
                <Mail className="h-4 w-4" />
                Continue with Email OTP
              </button>
            </>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-700 shadow-stitch">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-center text-xl font-black">Check your email</h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-600">
                OTP delivery is designed here and ready for the backend email-code endpoint.
              </p>
              <div className="mt-5 grid grid-cols-6 gap-2" aria-label="One time password input preview">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    className="h-12 rounded-2xl border border-slate-300 bg-white text-center font-mono text-lg font-black focus:border-emerald-500 focus:outline-none"
                    inputMode="numeric"
                    maxLength={1}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm font-bold text-slate-600">
                <button className="text-emerald-800" onClick={() => setOtpSent(false)} type="button">
                  Change Email
                </button>
                <span>Resend in 00:45</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-4">
        <p className="text-center text-sm font-semibold text-slate-600">
          Do not have a workspace?{" "}
          <Link className="font-black text-emerald-800" href="/website/onboarding">
            Create Workspace
          </Link>
        </p>
      </div>
    </>
  );
}
