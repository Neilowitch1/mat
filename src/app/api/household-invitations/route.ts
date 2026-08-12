import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { appUrl, brand } from "@/config/brand";

type InviteBody = { householdId?: string; email?: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !from) {
    return NextResponse.json({ error: "E-postutskick är inte konfigurerat. Lägg till RESEND_API_KEY och RESEND_FROM_EMAIL på servern." }, { status: 503 });
  }

  const body = (await request.json()) as InviteBody;
  const householdId = body.householdId?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!householdId || !email) return NextResponse.json({ error: "Hushåll och e-postadress krävs." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 });

  const [{ data: household }, { data: member }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
    supabase.from("household_members").select("role").eq("household_id", householdId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!household || member?.role !== "owner") return NextResponse.json({ error: "Endast en ägare kan bjuda in." }, { status: 403 });

  const token = randomBytes(24).toString("hex").toUpperCase();
  const { error: invitationError } = await supabase.rpc("create_email_invitation", { target_household_id: householdId, target_email: email, raw_token: token });
  if (invitationError) return NextResponse.json({ error: invitationError.message }, { status: 400 });

  const requestOrigin = new URL(request.url).origin;
  const origin = process.env.NEXT_PUBLIC_APP_URL ? appUrl : requestOrigin;
  const inviteUrl = `${origin}/inbjudan?token=${encodeURIComponent(token)}`;
  const householdName = escapeHtml(household.name);
  const inviter = escapeHtml(user.user_metadata.display_name || user.email || "En ägare");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Du är inbjuden till ${household.name} i ${brand.name}`,
      html: `<!doctype html><html lang="sv"><body style="margin:0;background:#f7f6f3;font-family:Arial,sans-serif;color:#222722"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:40px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fffdf9;border:1px solid #e7e2da;border-radius:24px"><tr><td style="padding:36px"><p style="margin:0 0 24px;color:#58755e;font-size:14px;font-weight:700;letter-spacing:.04em">${brand.name}</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.2">Välkommen till ${householdName}</h1><p style="margin:0 0 28px;color:#6f746e;line-height:1.6">${inviter} har bjudit in dig till hushållet <strong>${householdName}</strong>. Inbjudan är personlig och gäller i sju dagar.</p><a href="${inviteUrl}" style="display:inline-block;background:#58755e;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:18px">Acceptera inbjudan</a><p style="margin:28px 0 0;color:#6f746e;font-size:12px;line-height:1.5">Om du inte väntade dig detta mejl kan du ignorera det.</p></td></tr></table></td></tr></table></body></html>`,
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    console.error("Resend invitation failed", response.status, details);
    return NextResponse.json({ error: "Inbjudan skapades men mejlet kunde inte skickas. Försök igen." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
