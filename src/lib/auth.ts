import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export type CurrentUser = { id: string; email: string | null };

/** Reads and verifies the session (JWT signature checked by getClaims). Null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** Use in pages and actions that need a signed-in user. Fails closed to the login page. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = safeNextPath(returnTo);
    redirect(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  }
  return user;
}
