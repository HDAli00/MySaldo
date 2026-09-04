"use server";

import { redirect } from "next/navigation";
import { supabase } from "@/lib/db";
import { newId } from "@/lib/id";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import type { UserRow } from "@/lib/db/types";

export type AuthFormState = { error: string } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const { data: user, error } = await supabase
    .from("users")
    .insert({ id: newId(), email, password_hash: hashPassword(password) })
    .select("id")
    .single<Pick<UserRow, "id">>();
  if (error || !user) {
    return { error: "An account with this email already exists." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("email", email)
    .maybeSingle<Pick<UserRow, "id" | "password_hash">>();
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
