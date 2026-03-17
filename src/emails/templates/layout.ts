import { escapeHtml, safeText } from '@/lib/email/utils'

type EmailLayoutInput = {
  previewText: string
  heading: string
  eyebrow?: string
  subheading?: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  footerText?: string
  headerNote?: string
  summaryHtml?: string
  accentLabel?: string
}

export const renderEmailLayout = ({
  previewText,
  heading,
  eyebrow,
  subheading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerText,
  headerNote,
  summaryHtml,
  accentLabel,
}: EmailLayoutInput) => {
  const safePreview = escapeHtml(previewText)
  const safeHeading = escapeHtml(heading)
  const safeEyebrow = escapeHtml(eyebrow)
  const safeSubheading = escapeHtml(subheading)
  const safeHeaderNote = escapeHtml(headerNote)
  const safeAccentLabel = escapeHtml(accentLabel)
  const safeFooterText =
    safeText(footerText) || 'You are receiving this email because of activity on your Alxora account.'

  const siteBaseUrl = safeText(process.env.APP_BASE_URL) || 'https://alxora.com'
  const logoUrl = `${siteBaseUrl}/icons/alxora-favicon.png`
  const shopUrl = siteBaseUrl
  const helpUrl = `${siteBaseUrl}/help-center`
  const ordersUrl = `${siteBaseUrl}/UserBackend/orders`
  const messagesUrl = `${siteBaseUrl}/UserBackend/messages`
  const privacyUrl = `${siteBaseUrl}/privacy-policy`

  const ctaHtml =
    safeText(ctaLabel) && safeText(ctaUrl)
      ? `<tr>
          <td style="padding:0 32px 28px;">
            <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:15px 24px;border-radius:999px;background:linear-gradient(135deg,rgb(225 208 131) 0%,rgb(192 184 173) 45%,rgb(150 109 16) 100%);color:#111827;font-size:14px;font-weight:800;letter-spacing:0.01em;text-decoration:none;box-shadow:0 12px 24px rgba(150,109,16,0.22);">
              ${escapeHtml(ctaLabel)}
            </a>
          </td>
        </tr>`
      : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeHeading}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#f6f1df 0%,#eef2f7 180px);padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fffefb;border:1px solid rgba(148,163,184,0.18);border-radius:30px;overflow:hidden;box-shadow:0 22px 55px rgba(15,23,42,0.10);">
            <tr>
              <td style="padding:22px 32px 18px;background:#fff;border-bottom:1px solid rgba(226,232,240,0.9);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td valign="top">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td valign="middle" style="padding-right:12px;">
                            <img src="${logoUrl}" alt="Alxora" width="38" height="38" style="display:block;width:38px;height:38px;border-radius:999px;" />
                          </td>
                          <td valign="middle">
                            <div style="font-size:30px;font-weight:800;letter-spacing:0.06em;color:#1f2937;line-height:1;">ALXORA</div>
                            <div style="margin-top:6px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#8b6b16;">Essentials for everyday style</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" valign="middle">
                      <div style="font-size:12px;line-height:1.8;">
                        <a href="${ordersUrl}" style="color:#475569;text-decoration:none;font-weight:700;margin-left:16px;">Orders</a>
                        <a href="${messagesUrl}" style="color:#475569;text-decoration:none;font-weight:700;margin-left:16px;">Messages</a>
                        <a href="${helpUrl}" style="color:#475569;text-decoration:none;font-weight:700;margin-left:16px;">Help</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top left, rgba(236,222,162,0.42), transparent 42%),linear-gradient(180deg,#fffaf0 0%,#fffefb 100%);">
                  <tr>
                    <td style="padding:30px 32px 24px;">
                      ${
                        safeText(headerNote)
                          ? `<div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8b6b16;margin-bottom:12px;">${safeHeaderNote}</div>`
                          : ''
                      }
                      ${
                        safeText(eyebrow)
                          ? `<div style="display:inline-block;margin-bottom:14px;padding:8px 12px;border-radius:999px;background:rgba(225,208,131,0.2);border:1px solid rgba(150,109,16,0.14);font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#8b6b16;">${safeEyebrow}</div>`
                          : ''
                      }
                      <h1 style="margin:0 0 10px;font-size:34px;line-height:1.12;font-weight:800;color:#0f172a;">${safeHeading}</h1>
                      ${
                        safeText(subheading)
                          ? `<div style="max-width:540px;font-size:16px;line-height:1.7;color:#475569;">${safeSubheading}</div>`
                          : ''
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${
              safeText(summaryHtml)
                ? `<tr>
                    <td style="padding:24px 32px 8px;">
                      <div style="border-radius:24px;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);border:1px solid rgba(148,163,184,0.18);padding:20px 22px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.9);">
                        ${
                          safeText(accentLabel)
                            ? `<div style="font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;margin-bottom:12px;">${safeAccentLabel}</div>`
                            : ''
                        }
                        ${summaryHtml}
                      </div>
                    </td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="padding:16px 32px 20px;font-size:15px;line-height:1.8;color:#334155;">
                ${bodyHtml}
              </td>
            </tr>
            ${ctaHtml}
            <tr>
              <td style="padding:0 32px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid rgba(226,232,240,0.95);">
                  <tr>
                    <td style="padding-top:22px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td valign="top" style="padding-right:16px;font-size:13px;line-height:1.8;color:#64748b;">
                            <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Support</div>
                            <div><a href="${helpUrl}" style="color:#475569;text-decoration:none;">Help Center</a></div>
                            <div><a href="${messagesUrl}" style="color:#475569;text-decoration:none;">Messages</a></div>
                            <div><a href="${ordersUrl}" style="color:#475569;text-decoration:none;">Track orders</a></div>
                          </td>
                          <td valign="top" style="padding-right:16px;font-size:13px;line-height:1.8;color:#64748b;">
                            <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Company</div>
                            <div><a href="${shopUrl}" style="color:#475569;text-decoration:none;">Shop Alxora</a></div>
                            <div><a href="${privacyUrl}" style="color:#475569;text-decoration:none;">Privacy Policy</a></div>
                            <div><a href="mailto:shopalxora@gmail.com" style="color:#475569;text-decoration:none;">shopalxora@gmail.com</a></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;font-size:12px;line-height:1.8;color:#94a3b8;">
                ${escapeHtml(safeFooterText)}<br />
                © ${new Date().getFullYear()} Alxora. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
