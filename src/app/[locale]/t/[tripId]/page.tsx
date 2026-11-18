import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { Avatar, ButtonLink, Overline, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getMembers, getTrip } from "@/lib/data/trips";
import { formatTripDate } from "@/lib/format";
import { uuidSchema } from "@/lib/validation";

type Props = { params: Promise<{ locale: string; tripId: string }> };

export default function TripPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pb-16">
      <Suspense fallback={<div className="pt-20"><Skeleton /></div>}>
        <Trip params={params} />
      </Suspense>
    </main>
  );
}

async function Trip({ params }: Props) {
  const { locale, tripId } = await params;
  setRequestLocale(locale);
  await requireUser(`/t/${tripId}`);
  const t = await getTranslations("trip");
  const tTrips = await getTranslations("trips");
  const tRoles = await getTranslations("roles");

  const trip = uuidSchema.safeParse(tripId).success ? await getTrip(tripId) : null;
  if (!trip) {
    return (
      <>
        <AppHeader backHref="/" />
        <p className="rounded-(--radius-md) border border-dashed border-line p-6 text-[15px] text-ink-muted">{t("notFound")}</p>
      </>
    );
  }
  const members = await getMembers(tripId);

  return (
    <>
      <AppHeader backHref="/" />
      <section className="flex flex-col gap-2 rounded-[24px] bg-day-2 p-6 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-90">
          {trip.start_date && trip.end_date
            ? tTrips("dates", { start: formatTripDate(trip.start_date, locale), end: formatTripDate(trip.end_date, locale) })
            : tTrips("noDates")}
        </p>
        <h1 className="font-display text-[44px] leading-[48px] tracking-tight">{trip.title}</h1>
        {trip.destination ? <p className="text-[16px] opacity-90">{trip.destination}</p> : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Overline>{t("members")}</Overline>
          <ButtonLink href={`/t/${trip.id}/settings`} variant="ghost" className="px-3 text-[14px]">
            {t("settings")}
          </ButtonLink>
        </div>
        <ul className="flex flex-col divide-y divide-line rounded-(--radius-md) bg-surface shadow-(--shadow-1)">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} color={m.color} />
              <span className="flex-1 text-[15px]">{m.name}</span>
              <span className="text-[13px] text-ink-muted">{tRoles(m.role)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[14px] text-ink-muted">{t("comingNext")}</p>
    </>
  );
}
