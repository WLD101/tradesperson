import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import clsx from "clsx";

export const Button = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"button">) => (
  <button
    className={clsx(
      "inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60",
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
      "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
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
      "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500",
      className,
    )}
    {...props}
  />
);
