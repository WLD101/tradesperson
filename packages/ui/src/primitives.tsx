import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import clsx from "clsx";

export const Button = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"button">) => (
  <button
    className={clsx(
      "inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
);

export const Card = ({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) => (
  <div
    className={clsx(
      "rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
      className,
    )}
  >
    {children}
  </div>
);

export const Input = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) => (
  <input
    className={clsx(
      "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500",
      className,
    )}
    {...props}
  />
);
