import { describe, expect, it } from "vitest";
import { generateInviteToken, hashInviteToken, inviteExpiry, INVITE_TTL_DAYS } from "@/lib/invites";
import { inviteTokenSchema } from "@/lib/validation";

describe("invite tokens", () => {
  it("generates unique tokens that pass the URL schema", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(inviteTokenSchema.safeParse(a).success).toBe(true);
  });

  it("hashes to lowercase sha256 hex (same as the database)", () => {
    // sha256("abc") test vector
    expect(hashInviteToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("expires after the configured TTL", () => {
    const from = new Date("2026-11-18T00:00:00Z");
    expect(inviteExpiry(from).getTime() - from.getTime()).toBe(INVITE_TTL_DAYS * 86_400_000);
  });
});
