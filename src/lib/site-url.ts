import "server-only";
import { headers } from "next/headers";
import { configuredSiteUrl } from "@/lib/env";

/** Absolute origin for links we hand out (OAuth redirect, invite links). */
export async function getSiteUrl(): Promise<string> {
  const configured = configuredSiteUrl();
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host || !/^[A-Za-z0-9.-]+(:\d+)?$/.test(host)) {
    throw new Error("Cannot determine site URL: set NEXT_PUBLIC_SITE_URL.");
  }
  const proto = h.get("x-forwarded-proto") === "http" || host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}
