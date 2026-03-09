"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(_: unknown, formData: FormData): Promise<string | null> {
  const email = formData.get("email") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("credentials", { email, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Sign-in failed. Please check your email and try again.";
    }
    throw error; // Let Next.js handle NEXT_REDIRECT
  }
  return null;
}
