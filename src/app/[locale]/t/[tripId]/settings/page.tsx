import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { InvitePanel } from "@/components/invite-panel";
import { Avatar, Overline, Skeleton } from "@/components/ui";
import { revokeInvite } from "@/lib/actions/invites";
import { requireUser } from "@/lib/auth";
import { getActiveInvites, getMembers, getTrip } from "@/lib/data/trips";
import { formatDateTime } from "@/lib/format";
import { uuidSchema } from "@/lib/validation";

type Props = { params: Promise<{ locale: string; tripId: string }> };

export default function TripSettingsPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <Suspense fallback={<div className="pt-20"><Skeleton /></div>}>
        <Settings params={params} />
      </Suspense>
    </main>
  );
}

async function Settings({ params }: Props) {
  const { locale, tripId } = await params;
  setRequestLocale(locale);
  const user = await requireUser(`/t/${tripId}/settings`);
  const t = await getTranslations("settings");
  const tTrip = await getTranslations("trip");
  const tRoles = await getTranslations("roles");

  const trip = uuidSchema.safeParse(tripId).success ? await getTrip(tripId) : null;
  if (!trip) {
    return (
      <>
        <AppHeader backHref="/" />
        <p className="rounded-(--radius-md) border border-dashed border-line p-6 text-[15px] text-ink-muted">{tTrip("notFound")}</p>
      </>
    );
  }

  const [members, invites] = await Promise.all([getMembers(tripId), getActiveInvites(tripId)]);
  const isOwner = members.some((m) => m.userId === user.id && m.role === "owner");

  return (
    <>
      <AppHeader backHref={`/t/${trip.id}`} backLabel={trip.title} />
      <h1 className="font-display text-[32px] leading-[36px] tracking-tight">{t("title")}</h1>

      <section className="flex flex-col gap-3">
        <Overline>{t("members")}</Overline>
        <ul className="flex flex-col divide-y divide-line rounded-(--radius-md) bg-surface shadow-(--shadow-1)">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} color={m.color} />
              <span className="flex-1 text-[15px]">
                {m.name}
                {m.userId === user.id ? <span className="text-ink-muted"> ({t("you")})</span> : null}
              </span>
              <span className="text-[13px] text-ink-muted">{tRoles(m.role)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <Overline>{t("invite")}</Overline>
        {isOwner ? (
          <>
            <InvitePanel tripId={trip.id} />
            <Overline className="mt-2">{t("active")}</Overline>
            {invites.length === 0 ? (
              <p className="text-[14px] text-ink-muted">{t("none")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-(--radius-md) bg-surface shadow-(--shadow-1)">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="flex-1 text-[14px]">
                      {t("expires", {
                        role: tRoles(inv.role),
                        date: inv.expires_at ? formatDateTime(inv.expires_at, locale) : "—",
                      })}
                    </span>
                    <form action={revokeInvite}>
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <input type="hidden" name="tripId" value={trip.id} />
                      <button type="submit" className="min-h-11 rounded-full px-3 text-[14px] font-semibold text-danger hover:bg-accent-soft">
                        {t("revoke")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-[14px] text-ink-muted">{t("ownerOnly")}</p>
        )}
      </section>
    </>
  );
}
