import { redirect } from "next/navigation";

async function completeSignIn(formData: FormData) {
  "use server";
  const url = formData.get("url") as string;
  if (url?.startsWith("https://conftourneypickem.com") || url?.startsWith("http://localhost")) {
    redirect(url);
  }
  redirect("/login");
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; email?: string }>;
}) {
  const { url, email } = await searchParams;
  if (!url) redirect("/login");

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Sign In</h1>
        <p className="text-slate-600 mb-6">
          Click the button below to sign in{email ? ` as ${email}` : ""}.
        </p>
        <form action={completeSignIn}>
          <input type="hidden" name="url" value={url} />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
          >
            Complete Sign In
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-400">
          This link expires in 24 hours. If you didn&apos;t request this, ignore it.
        </p>
      </div>
    </div>
  );
}
