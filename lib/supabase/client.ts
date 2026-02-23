"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url, anonKey };
  }

  // Allow build-time prerendering in environments where public vars
  // are not injected yet. Runtime browser usage still requires real vars.
  if (typeof window === "undefined") {
    return {
      url: "https://placeholder.supabase.co",
      anonKey: "placeholder-anon-key"
    };
  }

  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    const config = getSupabasePublicConfig();
    browserClient = createBrowserClient(config.url, config.anonKey);
  }

  return browserClient;
}
