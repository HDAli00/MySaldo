import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** A Prisma client scoped to a single database transaction. */
export type ScopedDb = Prisma.TransactionClient;

/**
 * Runs `fn` inside a single Postgres transaction with `app.user_id` set to
 * `userId` for its duration, so the RLS policies on accounts/transactions/
 * imports (see the add_auth_and_rls migration) only let it see and write
 * that user's rows — enforced by Postgres, not just by the `where` clauses
 * in `fn`.
 *
 * `set_config(..., true)` scopes the setting to the current transaction
 * (`SET LOCAL` semantics), which is required for correctness under
 * Supavisor's transaction-mode pooling: each interactive `$transaction`
 * gets one dedicated connection for its lifetime, and the setting is gone
 * as soon as the transaction ends.
 */
export async function withUserScope<T>(userId: string, fn: (tx: ScopedDb) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
