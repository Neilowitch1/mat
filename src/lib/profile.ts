export function getProfileDisplayName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const normalizedName = displayName?.trim();
  if (normalizedName) return normalizedName;

  const normalizedEmail = email?.trim();
  if (!normalizedEmail) return "Okänd medlem";

  return normalizedEmail.split("@")[0] || normalizedEmail;
}
