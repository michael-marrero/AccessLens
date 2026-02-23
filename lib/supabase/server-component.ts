import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

export function createServerComponentSupabaseClient() {
  const cookieStore = cookies();
  const env = getPublicEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({
            name,
            value,
            ...options
          });
        } catch {
          // no-op for server components where response mutation is unavailable
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...options
          });
        } catch {
          // no-op for server components where response mutation is unavailable
        }
      }
    }
  });
}
