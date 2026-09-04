import { supabase } from "@/lib/db";
import { mapAccount } from "@/lib/db/map";
import type { Account, AccountRow } from "@/lib/db/types";

export async function listAccountsForUser(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .returns<AccountRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapAccount);
}

/**
 * Resolves the account id(s) a request may see: a single owned account, or
 * all of the user's accounts. Returns [] if `accountId` doesn't belong to
 * the user (matching the previous Prisma `account: { userId }` relation
 * filter, which silently yielded no rows for another user's account).
 */
export function resolveAccountScope(accounts: Account[], accountId: string | null): string[] {
  if (!accountId) return accounts.map((a) => a.id);
  return accounts.some((a) => a.id === accountId) ? [accountId] : [];
}
