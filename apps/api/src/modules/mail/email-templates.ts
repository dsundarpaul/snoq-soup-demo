const BRAND_NAME = "Scavly";
const COLOR_PRIMARY = "#5E4BB1";
const COLOR_PRIMARY_DARK = "#433B8F";
const COLOR_PAGE_BG = "#F1F5F9";
const COLOR_CARD_BG = "#FFFFFF";
const COLOR_TEXT = "#0F172A";
const COLOR_MUTED = "#64748B";
const COLOR_BORDER = "#E2E8F0";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layoutBrandedEmail(options: {
  readonly preheader: string;
  readonly title: string;
  readonly lead: string;
  readonly bodyLines: readonly string[];
  readonly ctaUrl: string;
  readonly ctaLabel: string;
  readonly secondaryNote: string;
  readonly frontendBase: string;
}): string {
  const safePreheader = escapeHtml(options.preheader);
  const safeTitle = escapeHtml(options.title);
  const safeLead = escapeHtml(options.lead);
  const safeBody = options.bodyLines.map((l) => escapeHtml(l));
  const safeCtaLabel = escapeHtml(options.ctaLabel);
  const safeSecondary = escapeHtml(options.secondaryNote);
  const safeFrontend = escapeHtml(options.frontendBase);
  const homeHref = escapeHtml(options.frontendBase);

  const bodyParagraphs = safeBody
    .map(
      (line) =>
        `<p style="margin:0 0 16px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.6;color:${COLOR_TEXT};">${line}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR_PAGE_BG};">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLOR_PAGE_BG};padding:24px 16px;">
<tr>
<td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:${COLOR_CARD_BG};border-radius:12px;overflow:hidden;border:1px solid ${COLOR_BORDER};">
<tr>
<td style="background:linear-gradient(135deg,${COLOR_PRIMARY} 0%,${COLOR_PRIMARY_DARK} 100%);background-color:${COLOR_PRIMARY};padding:28px 32px;">
<p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#FFFFFF;">${escapeHtml(BRAND_NAME)}</p>
<p style="margin:8px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;letter-spacing:0.12em;font-weight:600;color:rgba(255,255,255,0.92);">HUNT. CLAIM. REDEEM.</p>
</td>
</tr>
<tr>
<td style="padding:32px 32px 28px 32px;">
<p style="margin:0 0 12px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:600;line-height:1.35;color:${COLOR_TEXT};">${safeTitle}</p>
<p style="margin:0 0 20px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.6;color:${COLOR_MUTED};">${safeLead}</p>
${bodyParagraphs}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 24px 0;">
<tr>
<td style="border-radius:8px;background-color:${COLOR_PRIMARY};">
<a href="${options.ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">${safeCtaLabel}</a>
</td>
</tr>
</table>
<p style="margin:0 0 8px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;color:${COLOR_MUTED};">${safeSecondary}</p>
<p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;color:${COLOR_MUTED};">If the button does not work, copy and paste this link into your browser:<br><a href="${options.ctaUrl}" style="color:${COLOR_PRIMARY};word-break:break-all;">${escapeHtml(options.ctaUrl)}</a></p>
</td>
</tr>
<tr>
<td style="padding:0 32px 32px 32px;">
<p style="margin:0;padding-top:24px;border-top:1px solid ${COLOR_BORDER};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.6;color:${COLOR_MUTED};">You received this message because someone used this address with ${escapeHtml(BRAND_NAME)}. If that was not you, you can ignore this email.</p>
<p style="margin:12px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.6;color:${COLOR_MUTED};"><a href="${homeHref}" style="color:${COLOR_PRIMARY};text-decoration:none;">${safeFrontend}</a></p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function buildVerificationEmailContent(
  verifyUrl: string,
  frontendBase: string,
): { readonly subject: string; readonly text: string; readonly html: string } {
  const subject = `Verify your ${BRAND_NAME} email`;
  const preheader =
    "Confirm your email to finish setting up your merchant account.";
  const text = `${BRAND_NAME} — verify your email

Confirm your email address to activate your merchant account and start publishing drops.

Open this link in your browser:
${verifyUrl}

This link may expire for security reasons. If you did not create an account, you can ignore this message.

${frontendBase}`;

  const html = layoutBrandedEmail({
    preheader,
    title: "Confirm your email",
    lead: "Thanks for joining Scavly. Confirm your address to unlock the merchant dashboard and start sharing drops with hunters.",
    bodyLines: [
      "Tap the button below to verify your email. For your security, this link will not stay valid forever.",
    ],
    ctaUrl: verifyUrl,
    ctaLabel: "Verify email address",
    secondaryNote:
      "After verification, you can sign in and manage your storefront, drops, and vouchers in one place.",
    frontendBase,
  });

  return { subject, text, html };
}

export function buildVoucherMagicLinkEmailContent(
  magicLink: string,
  dropName: string,
  frontendBase: string,
): { readonly subject: string; readonly text: string; readonly html: string } {
  const subject = `Your ${BRAND_NAME} reward — ${dropName}`;
  const preheader = `Open your reward for ${dropName} in ${BRAND_NAME}.`;
  const hrefSafe = magicLink.replace(/"/g, "%22");

  const text = `${BRAND_NAME} — your reward

You asked to save your voucher for "${dropName}".

Open your reward:
${magicLink}

${frontendBase}`;

  const html = layoutBrandedEmail({
    preheader,
    title: "Open your reward",
    lead: `You asked to save your voucher for "${dropName}".`,
    bodyLines: [
      `Tap the button below to open your voucher and continue in ${BRAND_NAME}.`,
    ],
    ctaUrl: hrefSafe,
    ctaLabel: "Open your reward",
    secondaryNote:
      "If you did not request this email, you can ignore it — no changes will be made to your account.",
    frontendBase,
  });

  return { subject, text, html };
}

export function buildRewardClaimedNotificationEmailContent(
  voucherUrl: string,
  dropName: string,
  merchantDisplayName: string,
  frontendBase: string,
): { readonly subject: string; readonly text: string; readonly html: string } {
  const storeLine = merchantDisplayName.trim()
    ? `Congratulations — you've secured "${dropName}" from ${merchantDisplayName.trim()}!`
    : `Congratulations — you've secured "${dropName}"!`;

  const subject = `Reward claimed — ${dropName}`;
  const preheader = `You've claimed "${dropName}" in ${BRAND_NAME}.`;

  const text = `${BRAND_NAME} — reward claimed

${storeLine}

View your voucher anytime:
${voucherUrl}

${frontendBase}`;

  const html = layoutBrandedEmail({
    preheader,
    title: "You claimed a reward!",
    lead: storeLine,
    bodyLines: [
      "Your voucher is saved to your hunter account. You can open it below whenever you're ready — at the venue, show the voucher or QR code to complete redemption.",
      "We'll also email you again when your reward has been redeemed at the merchant.",
    ],
    ctaUrl: voucherUrl.replace(/"/g, "%22"),
    ctaLabel: "View my voucher",
    secondaryNote:
      "Keep this link handy until you've redeemed — it is unique to your claim.",
    frontendBase,
  });

  return { subject, text, html };
}

export function buildRewardRedeemedNotificationEmailContent(
  voucherUrl: string,
  dropName: string,
  merchantDisplayName: string,
  redeemedAt: Date,
  frontendBase: string,
): { readonly subject: string; readonly text: string; readonly html: string } {
  const when = redeemedAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const storeLine = merchantDisplayName.trim()
    ? `Your reward for "${dropName}" at ${merchantDisplayName.trim()} was redeemed on ${when}.`
    : `Your reward for "${dropName}" was redeemed on ${when}.`;

  const subject = `Reward redeemed — ${dropName}`;
  const preheader = `Your "${dropName}" reward was marked as redeemed.`;

  const text = `${BRAND_NAME} — reward redeemed

${storeLine}

You can still open your voucher page for your records:
${voucherUrl}

${frontendBase}`;

  const html = layoutBrandedEmail({
    preheader,
    title: "Reward redeemed",
    lead: "This is a quick confirmation for your records.",
    bodyLines: [
      storeLine,
      "Thanks for hunting with us — we hope you enjoyed the drop.",
    ],
    ctaUrl: voucherUrl.replace(/"/g, "%22"),
    ctaLabel: "Open voucher page",
    secondaryNote:
      "If you did not complete this redemption, contact the merchant or reach out to support through the app.",
    frontendBase,
  });

  return { subject, text, html };
}

export function buildPasswordResetEmailContent(
  resetUrl: string,
  frontendBase: string,
  kind: "merchant" | "hunter",
): { readonly subject: string; readonly text: string; readonly html: string } {
  const subject = `Reset your ${BRAND_NAME} password`;
  const accountLabel =
    kind === "merchant" ? "merchant account" : "treasure hunter account";
  const preheader = `Secure your ${BRAND_NAME} ${accountLabel} with a new password.`;

  const text = `${BRAND_NAME} — password reset

We received a request to reset the password for your ${accountLabel}.

Open this link to choose a new password:
${resetUrl}

If you did not ask for a reset, you can safely ignore this email. Your password will stay the same.

${frontendBase}`;

  const html = layoutBrandedEmail({
    preheader,
    title: "Reset your password",
    lead:
      kind === "merchant"
        ? "We received a request to reset the password for your merchant account."
        : "We received a request to reset the password for your treasure hunter account.",
    bodyLines: [
      "Use the button below to choose a new password. For security, this link expires after a short time and can only be used once.",
    ],
    ctaUrl: resetUrl,
    ctaLabel: "Choose a new password",
    secondaryNote:
      "If you did not request a password reset, you can ignore this message — your account will remain secure.",
    frontendBase,
  });

  return { subject, text, html };
}
