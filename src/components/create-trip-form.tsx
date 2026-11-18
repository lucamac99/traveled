"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useRef } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { createTrip } from "@/lib/actions/trips";
import { useHydrated } from "@/lib/use-hydrated";

export function CreateTripForm({ timeZones }: { timeZones: string[] }) {
  const t = useTranslations("newTrip");
  const [state, action, pending] = useActionState(createTrip, undefined);
  const tzRef = useRef<HTMLSelectElement>(null);
  const hydrated = useHydrated();
  const zones = useMemo(() => (timeZones.includes("UTC") ? timeZones : ["UTC", ...timeZones]), [timeZones]);
  const v = state?.values;

  // First visit: preselect the device time zone after hydration (the server can't know it).
  useEffect(() => {
    if (v) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tzRef.current && zones.includes(tz)) tzRef.current.value = tz;
  }, [v, zones]);

  const err = (key: string) => {
    const code = state?.errors?.[key];
    return code ? t(`errors.${code}` as "errors.title_required") : undefined;
  };

  // `key` remounts the form after each attempt so inputs show what the user typed, not empty defaults.
  return (
    <form key={state?.attempt ?? 0} action={action} className="flex flex-col gap-5" noValidate>
      <Field label={t("fieldTitle")} name="title" error={err("title")}>
        <input id="title" name="title" required maxLength={120} autoComplete="off" defaultValue={v?.title} className={inputClass} aria-invalid={!!err("title")} />
      </Field>
      <Field label={t("fieldDestination")} name="destination" error={err("destination")}>
        <input id="destination" name="destination" maxLength={200} autoComplete="off" defaultValue={v?.destination} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("fieldStart")} name="startDate" error={err("startDate")}>
          <input id="startDate" name="startDate" type="date" defaultValue={v?.startDate} className={inputClass} />
        </Field>
        <Field label={t("fieldEnd")} name="endDate" error={err("endDate")}>
          <input id="endDate" name="endDate" type="date" defaultValue={v?.endDate} className={inputClass} aria-invalid={!!err("endDate")} />
        </Field>
      </div>
      <Field label={t("fieldTimezone")} name="timezone" hint={t("timezoneHint")} error={err("timezone")}>
        <select ref={tzRef} id="timezone" name="timezone" defaultValue={v?.timezone ?? "UTC"} className={inputClass}>
          {zones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      {state?.formError ? (
        <p role="alert" className="text-[14px] font-medium text-danger">
          {t(`errors.${state.formError}` as "errors.save_failed")}
        </p>
      ) : null}
      <Button type="submit" disabled={!hydrated || pending} className="min-h-14">
        {t("submit")}
      </Button>
    </form>
  );
}
