import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || (ISO_DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))), {
    message: "invalid_date",
  });

export const createTripSchema = z
  .object({
    title: z.string().trim().min(1, "title_required").max(120, "title_too_long"),
    destination: z
      .string()
      .trim()
      .max(200, "destination_too_long")
      .transform((v) => (v === "" ? null : v)),
    startDate: optionalDate,
    endDate: optionalDate,
    timezone: z.string().trim().min(1).max(64).refine(isValidTimeZone, { message: "invalid_timezone" }),
  })
  .refine((t) => !t.startDate || !t.endDate || t.endDate >= t.startDate, {
    message: "end_before_start",
    path: ["endDate"],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const inviteRoleSchema = z.enum(["editor", "viewer"]);
export type InviteRole = z.infer<typeof inviteRoleSchema>;

export const uuidSchema = z.uuid();

/** Invite tokens are 32 random bytes in base64url (43 chars). */
export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/**
 * Only same-site relative paths may be used as a post-login destination.
 * Blocks open redirects such as //evil.example, /\evil.example and absolute URLs.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f]/.test(value)) return "/";
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
