"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { generateInviteToken, hashInviteToken, inviteExpiry } from "@/lib/invites";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { inviteRoleSchema, inviteTokenSchema, uuidSchema } from "@/lib/validation";

export type CreateInviteState = { link?: string; error?: string } | undefined;

/** Owner only (enforced by RLS). The raw token is returned once and never stored. */
export async function createInvite(_prev: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  const tripId = uuidSchema.safeParse(formData.get("tripId"));
  const role = inviteRoleSchema.safeParse(formData.get("role"));
  if (!tripId.success || !role.success) return { error: "invalid_input" };

  const user = await requireUser(`/t/${tripId.data}/settings`);
  const token = generateInviteToken();
  const supabase = await createClient();

  const { error } = await supabase.from("trip_invites").insert({
    trip_id: tripId.data,
    token_hash: hashInviteToken(token),
    role: role.data,
    expires_at: inviteExpiry().toISOString(),
    created_by: user.id,
  });

  if (error) {
    // 42501 = RLS denied: caller is not the trip owner.
    console.error("trip_invites.insert failed", { code: error.code, tripId: tripId.data });
    return { error: error.code === "42501" ? "not_allowed" : "save_failed" };
  }

  refresh();
  return { link: `${await getSiteUrl()}/join/${token}` };
}

export async function revokeInvite(formData: FormData) {
  const inviteId = uuidSchema.safeParse(formData.get("inviteId"));
  const tripId = uuidSchema.safeParse(formData.get("tripId"));
  if (!inviteId.success || !tripId.success) return;

  await requireUser(`/t/${tripId.data}/settings`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("trip_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId.data)
    .eq("trip_id", tripId.data);

  if (error) console.error("trip_invites.revoke failed", { code: error.code, inviteId: inviteId.data });
  refresh();
}

export async function acceptInvite(formData: FormData) {
  const token = inviteTokenSchema.safeParse(formData.get("token"));
  if (!token.success) redirect("/?invite=invalid");

  await requireUser(`/join/${token.data}`);
  const supabase = await createClient();
  const { data: tripId, error } = await supabase.rpc("accept_invite", { p_token: token.data });

  if (error || typeof tripId !== "string") {
    console.error("accept_invite failed", { code: error?.code });
    redirect("/?invite=invalid");
  }
  redirect(`/t/${tripId}`);
}
