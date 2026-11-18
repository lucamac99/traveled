import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { CreateTripForm } from "@/components/create-trip-form";
import { Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }> };

export default function NewTripPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pb-16">
      <Suspense fallback={<div className="pt-20"><Skeleton lines={4} /></div>}>
        <NewTrip params={params} />
      </Suspense>
    </main>
  );
}

async function NewTrip({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser("/new");
  const t = await getTranslations("newTrip");

  return (
    <>
      <AppHeader backHref="/" />
      <h1 className="font-display text-[34px] leading-[38px] tracking-tight">{t("title")}</h1>
      <CreateTripForm timeZones={Intl.supportedValuesOf("timeZone")} />
    </>
  );
}
