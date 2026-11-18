import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_DAYS = 14;

/** 32 random bytes, base64url: 43 URL-safe characters. Only ever shown once, in the invite link. */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Must match the database: encode(sha256(convert_to(token, 'UTF8')), 'hex'). */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function inviteExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}
