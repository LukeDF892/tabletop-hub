"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function getCallbackUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/auth/callback`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/auth/callback`;
  }
  return "http://localhost:3000/auth/callback";
}

export async function signIn(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(
  email: string,
  password: string,
  username: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: getCallbackUrl(),
    },
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function signInWithMagicLink(
  email: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getCallbackUrl(),
    },
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}
