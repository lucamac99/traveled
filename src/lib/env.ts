import { z } from "zod";

// Read lazily so builds and tests don't need real values; fail closed at first use.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    throw new Error("Missing or invalid Supabase env vars. See .env.example.");
  }
  return parsed.data;
}

/** Canonical site URL, e.g. https://wayfare.vercel.app. Optional; falls back to the request host. */
export function configuredSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  const parsed = z.url().safeParse(raw);
  return parsed.success ? parsed.data.replace(/\/+$/, "") : null;
}
