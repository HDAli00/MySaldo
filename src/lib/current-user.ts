import "server-only";

import type { User } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Resolves the internal `users` row for a signed-in Supabase Auth identity,
 * creating one on first sign-in. If exactly one legacy, pre-auth row exists
 * (auth_user_id IS NULL — data imported before this app had accounts at
 * all), the first person who signs in claims it instead of getting a fresh,
 * empty account.
 *
 * Runs inside its own transaction with `app.auth_user_id` set so the
 * `users_self_or_unclaimed` RLS policy can resolve/claim/create the row
 * before we know its internal id (see the add_auth_and_rls migration).
 */
export async function resolveAppUser(authUserId: string, email: string | null): Promise<User> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.auth_user_id', ${authUserId}, true)`;

    const existing = await tx.user.findFirst({ where: { authUserId } });
    if (existing) return existing;

    const claimed = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "users"
      SET "auth_user_id" = ${authUserId}, "email" = ${email}
      WHERE "id" = (SELECT "id" FROM "users" WHERE "auth_user_id" IS NULL LIMIT 1)
      RETURNING "id"
    `;
    if (claimed.length > 0) {
      return tx.user.findUniqueOrThrow({ where: { id: claimed[0].id } });
    }

    return tx.user.create({ data: { authUserId, email } });
  });
}
