/**
 * RLS + invite flow against a LOCAL Supabase (`npx supabase start`). Never point this at a hosted project.
 * Skipped unless SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY and SUPABASE_TEST_SECRET_KEY are set.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { generateInviteToken, hashInviteToken, inviteExpiry } from "@/lib/invites";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.SUPABASE_TEST_URL;
const publishable = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_TEST_SECRET_KEY;
const enabled = Boolean(url && publishable && secret);
const isLocal = !!url && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);

type Client = SupabaseClient<Database>;

async function newUser(admin: Client, name: string): Promise<{ client: Client; id: string }> {
  const email = `${name}-${randomUUID()}@test.local`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const client = createClient<Database>(url!, publishable!, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, id: data.user.id };
}

describe.skipIf(!enabled)("RLS and invites (local Supabase)", () => {
  let owner: { client: Client; id: string };
  let friend: { client: Client; id: string };
  let stranger: { client: Client; id: string };
  let tripId: string;

  beforeAll(async () => {
    if (!isLocal) throw new Error("Refusing to run DB tests against a non-local Supabase URL.");
    const admin = createClient<Database>(url!, secret!, { auth: { persistSession: false } });
    [owner, friend, stranger] = await Promise.all([
      newUser(admin, "Owner"),
      newUser(admin, "Friend"),
      newUser(admin, "Stranger"),
    ]);

    const { data, error } = await owner.client
      .from("trips")
      .insert({ owner_id: owner.id, title: "Japan", timezone: "Asia/Tokyo" })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("trip insert failed");
    tripId = data.id;
  });

  it("makes the creator the owner", async () => {
    const { data } = await owner.client.from("trip_members").select("user_id, role").eq("trip_id", tripId);
    expect(data).toEqual([{ user_id: owner.id, role: "owner" }]);
  });

  it("hides the trip from non-members", async () => {
    const { data } = await stranger.client.from("trips").select("id").eq("id", tripId);
    expect(data).toEqual([]);
  });

  it("does not let a user create a trip for someone else", async () => {
    const { error } = await stranger.client.from("trips").insert({ owner_id: owner.id, title: "Spoof" });
    expect(error?.code).toBe("42501");
  });

  it("does not let non-owners create invites", async () => {
    const { error } = await stranger.client.from("trip_invites").insert({
      trip_id: tripId,
      token_hash: hashInviteToken(generateInviteToken()),
      role: "editor",
      created_by: stranger.id,
    });
    expect(error?.code).toBe("42501");
  });

  it("does not let anyone add themselves as a member directly", async () => {
    const { error } = await stranger.client.from("trip_members").insert({ trip_id: tripId, user_id: stranger.id, role: "editor" });
    expect(error).not.toBeNull();
  });

  it("joins via a valid invite (app hash matches DB hash) as viewer", async () => {
    const token = generateInviteToken();
    const { error } = await owner.client.from("trip_invites").insert({
      trip_id: tripId,
      token_hash: hashInviteToken(token),
      role: "viewer",
      expires_at: inviteExpiry().toISOString(),
      created_by: owner.id,
    });
    expect(error).toBeNull();

    const { data: preview } = await friend.client.rpc("invite_preview", { p_token: token });
    expect(preview?.[0]?.trip_title).toBe("Japan");

    const { data: joined, error: joinError } = await friend.client.rpc("accept_invite", { p_token: token });
    expect(joinError).toBeNull();
    expect(joined).toBe(tripId);

    const { data: trip } = await friend.client.from("trips").select("id").eq("id", tripId);
    expect(trip).toHaveLength(1);
  });

  it("lets viewers read but not edit, and hides invites from them", async () => {
    const { data: updated } = await friend.client.from("trips").update({ title: "Hacked" }).eq("id", tripId).select("id");
    expect(updated).toEqual([]);
    const { data: invites } = await friend.client.from("trip_invites").select("id").eq("trip_id", tripId);
    expect(invites).toEqual([]);
  });

  it("shows member profiles only to people who share a trip", async () => {
    const { data: seen } = await friend.client.from("profiles").select("id").eq("id", owner.id);
    expect(seen).toHaveLength(1);
    const { data: hidden } = await stranger.client.from("profiles").select("id").eq("id", owner.id);
    expect(hidden).toEqual([]);
  });

  it("rejects revoked and expired invites", async () => {
    const revoked = generateInviteToken();
    const expired = generateInviteToken();
    await owner.client.from("trip_invites").insert([
      { trip_id: tripId, token_hash: hashInviteToken(revoked), role: "editor", created_by: owner.id, revoked_at: new Date().toISOString() },
      { trip_id: tripId, token_hash: hashInviteToken(expired), role: "editor", created_by: owner.id, expires_at: new Date(Date.now() - 1000).toISOString() },
    ]);

    for (const token of [revoked, expired, generateInviteToken()]) {
      const { error } = await stranger.client.rpc("accept_invite", { p_token: token });
      expect(error?.message).toBe("invalid_invite");
    }
    const { data } = await stranger.client.from("trips").select("id").eq("id", tripId);
    expect(data).toEqual([]);
  });

  it("never lets the owner be changed", async () => {
    const { error } = await owner.client.from("trips").update({ owner_id: friend.id }).eq("id", tripId);
    expect(error).not.toBeNull();
  });

  it("does not let invites grant the owner role", async () => {
    const { error } = await owner.client.from("trip_invites").insert({
      trip_id: tripId,
      token_hash: hashInviteToken(generateInviteToken()),
      role: "owner",
      created_by: owner.id,
    });
    expect(error).not.toBeNull();
  });
});
