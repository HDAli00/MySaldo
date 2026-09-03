import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Server-side Supabase client bound to the request's cookies. Safe to call
 * from Server Components, Route Handlers, and Server Actions.
 *
 * Writing cookies from a Server Component throws (React forbids it there) —
 * that's fine because `proxy.ts` refreshes the session cookie on every
 * request before Server Components render, so a plain read is enough there.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; the proxy already refreshed
          // the session, so this write can be safely ignored.
        }
      },
    },
  });
}
