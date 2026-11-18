import "server-only";

/**
 * Sends the invitation email through Resend when RESEND_API_KEY and
 * INVITE_FROM_EMAIL are set. Returns false (and sends nothing) otherwise, so
 * the UI can say the link must be shared by hand.
 */
export async function sendInvitationEmail(input: { to: string; orgName: string; link: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `You're invited to ${input.orgName} on Keelwork`,
      text: `You've been invited to join ${input.orgName} on Keelwork.\n\nAccept the invitation: ${input.link}\n\nThe link works once and expires in 7 days.`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return Boolean(res?.ok);
}
