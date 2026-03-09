"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(_: unknown, formData: FormData): Promise<{ error?: string; sent?: boolean }> {
  const email = formData.get("email") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("resend", { email, redirectTo: callbackUrl, redirect: false });
    return { sent: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Failed to send magic link. Please try again." };
    }
    throw error;
  }
}
