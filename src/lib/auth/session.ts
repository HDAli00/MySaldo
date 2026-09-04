import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabase } from "@/lib/db";
import { newId } from "@/lib/id";
import { mapUser } from "@/lib/db/map";
import type { User } from "@/lib/db/types";
import type { UserRow } from "@/lib/db/types";

export const SESSION_COOKIE = "saldo_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  user: User;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const { error } = await supabase.from("sessions").insert({
    id: newId(),
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/** Verifies the session cookie against the database. Memoized per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, token_hash, expires_at, created_at, user:users(id, email, password_hash, currency, created_at)")
    .eq("token_hash", hashToken(token))
    .maybeSingle<{
      id: string;
      user_id: string;
      token_hash: string;
      expires_at: string;
      created_at: string;
      user: UserRow | null;
    }>();

  if (error || !data || !data.user) return null;

  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) return null;

  return {
    id: data.id,
    userId: data.user_id,
    tokenHash: data.token_hash,
    expiresAt,
    createdAt: new Date(data.created_at),
    user: mapUser(data.user),
  };
});

/** For Server Components/pages: verifies the session or redirects to /login. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await supabase.from("sessions").delete().eq("token_hash", hashToken(token));
  }
  cookieStore.delete(SESSION_COOKIE);
}
