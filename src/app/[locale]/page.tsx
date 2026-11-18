import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { ButtonLink, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listMyTrips } from "@/lib/data/trips";
import { formatTripDate } from "@/lib/format";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invite?: string }>;
};

export default function TripsPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pb-28">
      <Suspense fallback={<div className="pt-20"><Skeleton /></div>}>
        <Trips params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Trips({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser("/");
  const [{ invite }, trips, t] = await Promise.all([searchParams, listMyTrips(), getTranslations("trips")]);

  return (
    <>
      <AppHeader />
      <h1 className="font-display text-[36px] leading-[40px] tracking-tight">{t("title")}</h1>

      {invite === "invalid" ? (
        <p role="alert" className="rounded-(--radius-md) bg-accent-soft p-4 text-[15px] text-accent-strong">
          {t("inviteInvalid")}
        </p>
      ) : null}

      {trips.length === 0 ? (
        <p className="rounded-(--radius-md) border border-dashed border-line p-6 text-[15px] text-ink-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip, i) => (
            <li key={trip.id}>
              <Link
                href={`/t/${trip.id}`}
                className="flex flex-col gap-1 overflow-hidden rounded-[20px] bg-surface text-ink no-underline shadow-(--shadow-2)"
              >
                <span aria-hidden="true" className="h-2" style={{ background: `var(--day-${(i % 10) + 1})` }} />
                <span className="flex flex-col gap-1 px-5 pb-5 pt-3">
                  <span className="font-display text-[26px] leading-[30px]">{trip.title}</span>
                  <span className="text-[15px] text-ink-muted">
                    {trip.start_date && trip.end_date
                      ? t("dates", {
                          start: formatTripDate(trip.start_date, locale),
                          end: formatTripDate(trip.end_date, locale),
                        })
                      : t("noDates")}
                    {trip.destination ? ` · ${trip.destination}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ButtonLink href="/new" variant="dark" className="fixed bottom-8 right-4 min-h-14 shadow-(--shadow-2)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14M12 5v14" />
        </svg>
        {t("new")}
      </ButtonLink>
    </>
  );
}
