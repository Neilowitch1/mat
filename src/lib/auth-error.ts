const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "invalid login credentials": "Fel e-postadress eller lösenord.",
  "email not confirmed": "E-postadressen är inte bekräftad.",
  "user already registered": "Det finns redan ett konto med den e-postadressen.",
};

export function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Något gick fel.";

  return AUTH_ERROR_MESSAGES[error.message.toLowerCase()] ?? error.message;
}
