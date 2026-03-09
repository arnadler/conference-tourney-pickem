"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _: unknown,
  formData: FormData
): Promise<{ error?: string; sent?: boolean }> {
  const email = formData.get("email") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("resend", { email, redirectTo: callbackUrl, redirect: false });
    return { sent: true };
  } catch (error) {
    // NextAuth may throw NEXT_REDIRECT even with redirect:false — treat as success
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      return { sent: true };
    }
    if (error instanceof AuthError) {
      console.error("AuthError during sign-in:", error.type, error.message);
      return { error: "Failed to send magic link. Please try again." };
    }
    console.error("Unexpected sign-in error:", error);
    return { error: "Failed to send magic link. Please try again." };
  }
}
