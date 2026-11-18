import { describe, expect, it } from "vitest";
import { createTripSchema, inviteTokenSchema, safeNextPath } from "@/lib/validation";

describe("safeNextPath", () => {
  it.each([
    ["/t/abc", "/t/abc"],
    ["/join/token?x=1", "/join/token?x=1"],
    ["/", "/"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil",
    "/\u0000x",
    "",
    null,
    undefined,
  ])("rejects %s", (input) => {
    expect(safeNextPath(input as string | null | undefined)).toBe("/");
  });
});

describe("createTripSchema", () => {
  const base = { title: "Japan", destination: "", startDate: "", endDate: "", timezone: "Asia/Tokyo" };

  it("accepts a minimal trip and normalises empty fields to null", () => {
    const r = createTripSchema.parse(base);
    expect(r).toEqual({ title: "Japan", destination: null, startDate: null, endDate: null, timezone: "Asia/Tokyo" });
  });

  it("rejects an empty title", () => {
    const r = createTripSchema.safeParse({ ...base, title: "   " });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("title_required");
  });

  it("rejects an end date before the start date", () => {
    const r = createTripSchema.safeParse({ ...base, startDate: "2027-04-17", endDate: "2027-04-03" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("end_before_start");
  });

  it("rejects an unknown time zone", () => {
    const r = createTripSchema.safeParse({ ...base, timezone: "Mars/Olympus" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("invalid_timezone");
  });

  it("rejects malformed dates", () => {
    expect(createTripSchema.safeParse({ ...base, startDate: "03/04/2027" }).success).toBe(false);
  });
});

describe("inviteTokenSchema", () => {
  it("accepts 43-char base64url tokens only", () => {
    expect(inviteTokenSchema.safeParse("a".repeat(43)).success).toBe(true);
    expect(inviteTokenSchema.safeParse("a".repeat(42)).success).toBe(false);
    expect(inviteTokenSchema.safeParse(`${"a".repeat(42)}/`).success).toBe(false);
  });
});
