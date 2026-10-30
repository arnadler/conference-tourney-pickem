/**
 * Public-facing name for a user. Never exposes a full email address:
 * falls back to a masked form like "j***@gmail.com".
 */
export function displayName(name: string | null | undefined, email: string | null | undefined, fallback = "Anonymous"): string {
  if (name?.trim()) return name.trim();
  if (email) {
    const [local, domain] = email.split("@");
    if (local && domain) return `${local[0]}***@${domain}`;
  }
  return fallback;
}
