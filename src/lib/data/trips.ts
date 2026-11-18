import "server-only";
import { createClient } from "@/lib/supabase/server";

// All reads run as the signed-in user, so RLS decides what comes back.

export type TripSummary = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type Member = {
  userId: string;
  role: "owner" | "editor" | "viewer";
  name: string;
  color: string;
};

export type Invite = { id: string; role: "editor" | "viewer"; expires_at: string | null };

const MEMBER_COLORS = ["#C2532B", "#577A2C", "#7A4E8C", "#4F5FA8", "#24796A", "#B23F62", "#9C6B1A", "#2F6F8F"];

export async function listMyTrips(): Promise<TripSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date")
    .is("archived_at", null)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`trips.list failed (${error.code})`);
  return data ?? [];
}

export async function getTrip(tripId: string): Promise<(TripSummary & { timezone: string }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date, timezone")
    .eq("id", tripId)
    .maybeSingle();
  if (error) throw new Error(`trips.get failed (${error.code})`);
  return data;
}

export async function getMembers(tripId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("trip_members")
    .select("user_id, role, color, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`trip_members.list failed (${error.code})`);
  if (!rows?.length) return [];

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in(
      "id",
      rows.map((r) => r.user_id),
    );
  if (pErr) throw new Error(`profiles.list failed (${pErr.code})`);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return rows.map((r, i) => ({
    userId: r.user_id,
    role: r.role,
    name: names.get(r.user_id) ?? "Traveller",
    color: r.color ?? MEMBER_COLORS[i % MEMBER_COLORS.length],
  }));
}

/** Active invite links. Empty for non-owners (RLS). */
export async function getActiveInvites(tripId: string): Promise<Invite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_invites")
    .select("id, role, expires_at")
    .eq("trip_id", tripId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(`trip_invites.list failed (${error.code})`);
  return (data ?? []).filter((i): i is Invite => i.role !== "owner");
}

export async function previewInvite(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_preview", { p_token: token });
  if (error) throw new Error(`invite_preview failed (${error.code})`);
  return data?.[0] ?? null;
}
