export function normalizeProductDisplayName(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) return "";

  const [firstCharacter, ...remainingCharacters] = [...trimmedName];
  return `${firstCharacter.toLocaleUpperCase("sv-SE")}${remainingCharacters.join("")}`;
}
