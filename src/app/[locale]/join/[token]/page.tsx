import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Button, ButtonLink, Skeleton } from "@/components/ui";
import { acceptInvite } from "@/lib/actions/invites";
import { requireUser } from "@/lib/auth";
import { previewInvite } from "@/lib/data/trips";
import { formatTripDate } from "@/lib/format";
import { inviteTokenSchema } from "@/lib/validation";

type Props = { params: Promise<{ locale: string; token: string }> };

export const metadata = { referrer: "no-referrer" as const };

export default function JoinPage({ params }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <Suspense fallback={<Skeleton lines={2} />}>
        <Join params={params} />
      </Suspense>
    </main>
  );
}

async function Join({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("join");
  const tRoles = await getTranslations("roles");
  const tTrips = await getTranslations("trips");

  const valid = inviteTokenSchema.safeParse(token).success;
  await requireUser(valid ? `/join/${token}` : "/");
  const invite = valid ? await previewInvite(token) : null;

  if (!invite) {
    return (
      <>
        <p role="alert" className="rounded-(--radius-md) bg-accent-soft p-5 text-[15px] text-accent-strong">
          {t("invalid")}
        </p>
        <ButtonLink href="/" variant="secondary">
          {tTrips("title")}
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t("title")}</p>
        <h1 className="font-display text-[44px] leading-[48px] tracking-tight">{invite.trip_title}</h1>
        <p className="text-[16px] text-ink-muted">
          {invite.start_date && invite.end_date
            ? tTrips("dates", { start: formatTripDate(invite.start_date, locale), end: formatTripDate(invite.end_date, locale) })
            : tTrips("noDates")}
          {invite.destination ? ` · ${invite.destination}` : ""}
        </p>
        <p className="text-[15px]">{t("as", { role: tRoles(invite.role) })}</p>
      </div>
      <form action={acceptInvite}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" className="min-h-14 w-full text-[16px]">
          {t("button")}
        </Button>
      </form>
    </>
  );
}
