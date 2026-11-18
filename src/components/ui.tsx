import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "dark";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-95",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "bg-transparent text-accent-strong hover:bg-accent-soft",
  dark: "bg-ink text-bg hover:opacity-90",
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[filter,background-color,opacity] duration-(--dur-tap) disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} no-underline ${variants[variant]} ${className}`} {...props} />;
}

export function Overline({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted ${className}`}>{children}</p>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-(--radius-xs) border border-line bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-muted aria-invalid:border-danger";

export function Avatar({ name, color }: { name: string; color?: string | null }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white ring-2 ring-bg"
      style={{ background: color ?? "var(--day-8)" }}
    >
      {initials}
    </span>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-(--radius-md) bg-surface-2" />
      ))}
    </div>
  );
}
