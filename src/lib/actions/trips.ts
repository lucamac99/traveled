"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createTripSchema } from "@/lib/validation";

export type CreateTripValues = Record<"title" | "destination" | "startDate" | "endDate" | "timezone", string>;
export type CreateTripState =
  | { errors?: Record<string, string>; formError?: string; values: CreateTripValues; attempt: number }
  | undefined;

export async function createTrip(prev: CreateTripState, formData: FormData): Promise<CreateTripState> {
  const user = await requireUser("/new");

  const field = (k: string) => String(formData.get(k) ?? "").slice(0, 300);
  const values: CreateTripValues = {
    title: field("title"),
    destination: field("destination"),
    startDate: field("startDate"),
    endDate: field("endDate"),
    timezone: field("timezone"),
  };
  const attempt = (prev?.attempt ?? 0) + 1;

  const parsed = createTripSchema.safeParse(values);

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors, values, attempt };
  }

  const t = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      owner_id: user.id,
      title: t.title,
      destination: t.destination,
      start_date: t.startDate,
      end_date: t.endDate,
      timezone: t.timezone,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("trips.insert failed", { code: error?.code });
    return { formError: "save_failed", values, attempt };
  }

  redirect(`/t/${data.id}`);
}
