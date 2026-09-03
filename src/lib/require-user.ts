import "server-only";

import type { User } from "@prisma/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAppUser } from "@/lib/current-user";

/**
 * Verifies the request's Supabase session (revalidated against the auth
 * server, not just decoded from the cookie — see Supabase's docs on why
 * `getUser()` is preferred over `getSession()` for trust decisions) and
 * resolves the matching internal `users` row. Returns null if there is no
 * signed-in user.
 */
export async function getCurrentAppUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return resolveAppUser(user.id, user.email ?? null);
}
