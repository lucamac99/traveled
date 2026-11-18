import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/lib/actions/auth";

export async function AppHeader({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
  const t = await getTranslations("common");
  return (
    <header className="flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),16px)]">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold no-underline"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {backLabel ?? t("back")}
        </Link>
      ) : (
        <span className="font-display text-[22px] tracking-tight">{t("appName")}</span>
      )}
      <form action={signOut}>
        <button type="submit" className="min-h-11 rounded-full px-3 text-[14px] font-medium text-ink-muted hover:text-ink">
          {t("signOut")}
        </button>
      </form>
    </header>
  );
}
