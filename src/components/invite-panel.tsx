"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { createInvite } from "@/lib/actions/invites";
import { useHydrated } from "@/lib/use-hydrated";

export function InvitePanel({ tripId }: { tripId: string }) {
  const t = useTranslations("settings");
  const tRoles = useTranslations("roles");
  const [state, action, pending] = useActionState(createInvite, undefined);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const hydrated = useHydrated();

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
    } catch {
      setCopiedLink(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-(--radius-md) bg-surface p-4 shadow-(--shadow-1)">
      <p className="text-[14px] text-ink-muted">{t("inviteHint")}</p>
      <form action={action} className="flex items-end gap-3">
        <input type="hidden" name="tripId" value={tripId} />
        <div className="flex-1">
          <Field label={t("role")} name="role">
            <select id="role" name="role" defaultValue="editor" className={inputClass}>
              <option value="editor">{tRoles("editor")}</option>
              <option value="viewer">{tRoles("viewer")}</option>
            </select>
          </Field>
        </div>
        <Button type="submit" disabled={!hydrated || pending} className="min-h-12">
          {t("createLink")}
        </Button>
      </form>

      {state?.error ? (
        <p role="alert" className="text-[14px] font-medium text-danger">
          {t(`errors.${state.error}` as "errors.save_failed")}
        </p>
      ) : null}

      {state?.link ? (
        <div className="flex flex-col gap-2 rounded-(--radius-sm) bg-accent-soft p-3">
          <label htmlFor="invite-link" className="text-[13px] font-medium text-accent-strong">
            {t("linkOnce")}
          </label>
          <div className="flex gap-2">
            <input id="invite-link" readOnly value={state.link} className={`${inputClass} font-mono text-[13px]`} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="secondary" onClick={() => copy(state.link!)}>
              {copiedLink === state.link ? t("copied") : t("copy")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
