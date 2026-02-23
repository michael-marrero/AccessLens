"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export async function authFetch<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (init?.body && !headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload.data as T;
}
