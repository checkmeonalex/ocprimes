import { escapeHtml, safeText } from '@/lib/email/utils'

type EmailLayoutInput = {
  previewText: string
  heading: string
  eyebrow?: string
  subheading?: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  secondaryCtaLabel?: string
  secondaryCtaUrl?: string
  footerText?: string
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
  secondaryCtaLabel,
  secondaryCtaUrl,
  footerText,
  summaryHtml,
  accentLabel,
}: EmailLayoutInput) => {
  const safePreview = escapeHtml(previewText)
  const safeHeading = escapeHtml(heading)
  const safeEyebrow = escapeHtml(eyebrow)
  const safeSubheading = escapeHtml(subheading)
  const safeAccentLabel = escapeHtml(accentLabel)
  const safeFooterText =
    safeText(footerText) || 'You are receiving this email because of activity on your Alxora account.'

  const siteBaseUrl = safeText(process.env.APP_BASE_URL) || 'https://alxora.com'
  const logoUrl =
    'https://alxora.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Ffulllogo.8e8a824d.png&w=1080&q=75'
  const shopUrl = siteBaseUrl
  const helpUrl = `${siteBaseUrl}/help-center`
  const ordersUrl = `${siteBaseUrl}/account/orders`
  const messagesUrl = `${siteBaseUrl}/account/messages`
  const privacyUrl = `${siteBaseUrl}/privacy-policy`

  const ctaHtml =
    safeText(ctaLabel) && safeText(ctaUrl)
      ? `<tr>
          <td style="padding:0 32px 28px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td align="left">
                  <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 22px;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
                    ${escapeHtml(ctaLabel)}
                  </a>
                </td>
                <td align="right" valign="middle">
                  ${
                    safeText(secondaryCtaLabel) && safeText(secondaryCtaUrl)
                      ? `<a href="${escapeHtml(secondaryCtaUrl)}" style="display:inline-block;font-size:14px;font-weight:700;color:#374151;text-decoration:none;">
                           ${escapeHtml(secondaryCtaLabel)}
                         </a>`
                      : ''
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeHeading}</title>
    <style>
      @font-face {
        font-family: 'Outfit';
        src: url('https://alxora.com/email/fonts/outfit-variable.woff2') format('woff2');
        font-weight: 100 900;
        font-style: normal;
      }

      @media only screen and (max-width: 640px) {
        .email-shell {
          padding: 0 !important;
        }

        .email-card {
          border-left: 0 !important;
          border-right: 0 !important;
        }

        .email-section {
          padding-left: 20px !important;
          padding-right: 20px !important;
        }

        .email-header-brand,
        .email-header-nav-cell {
          display: block !important;
          width: 100% !important;
        }

        .email-header-nav-cell {
          padding-top: 16px !important;
          text-align: left !important;
        }

        .email-header-nav {
          text-align: left !important;
        }

        .email-header-nav a {
          display: inline-block !important;
          margin: 0 16px 0 0 !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-shell" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="max-width:680px;background:#fffdf8;border:1px solid #ddd6c8;overflow:hidden;">
            <tr>
              <td class="email-section" style="padding:24px 32px 18px;background:#fffdf8;border-bottom:1px solid #e7e1d4;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td valign="top" class="email-header-brand">
                      <img src="${logoUrl}" alt="Alxora" width="206" style="display:block;width:206px;max-width:100%;height:auto;" />
                      <div style="margin-top:8px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#9a7a23;">Essentials for everyday style</div>
                    </td>
                    <td align="right" valign="middle" class="email-header-nav-cell">
                      <div style="font-size:12px;line-height:1.8;" class="email-header-nav">
                        <a href="${ordersUrl}" style="color:#4b5563;text-decoration:none;font-weight:700;margin-left:16px;">Orders</a>
                        <a href="${messagesUrl}" style="color:#4b5563;text-decoration:none;font-weight:700;margin-left:16px;">Messages</a>
                        <a href="${helpUrl}" style="color:#4b5563;text-decoration:none;font-weight:700;margin-left:16px;">Help</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" style="padding:30px 32px 24px;background:#fcfaf5;border-bottom:1px solid #efe7d8;">
                ${
                  safeText(eyebrow)
                    ? `<div style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#9a7a23;margin-bottom:16px;">${safeEyebrow}</div>`
                    : ''
                }
                <h1 style="margin:0 0 10px;font-size:34px;line-height:1.16;font-weight:800;color:#111827;">${safeHeading}</h1>
                ${
                  safeText(subheading)
                    ? `<div style="max-width:560px;font-size:16px;line-height:1.7;color:#4b5563;">${safeSubheading}</div>`
                    : ''
                }
              </td>
            </tr>
            ${
              safeText(summaryHtml)
                ? `<tr>
                    <td class="email-section" style="padding:24px 32px 8px;">
                      <div style="background:#ffffff;border:1px solid #e7e1d4;padding:20px 22px;">
                        ${
                          safeText(accentLabel)
                            ? `<div style="font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#8a8f98;margin-bottom:12px;">${safeAccentLabel}</div>`
                            : ''
                        }
                        ${summaryHtml}
                      </div>
                    </td>
                  </tr>`
                : ''
            }
            <tr>
              <td class="email-section" style="padding:16px 32px 20px;font-size:15px;line-height:1.8;color:#334155;">
                ${bodyHtml}
              </td>
            </tr>
            ${ctaHtml}
            <tr>
              <td class="email-section" style="padding:0 32px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7e1d4;">
                  <tr>
                    <td style="padding-top:22px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td valign="top" style="padding-right:16px;font-size:13px;line-height:1.8;color:#64748b;">
                            <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:8px;">Support</div>
                            <div><a href="${helpUrl}" style="color:#475569;text-decoration:none;">Help Center</a></div>
                            <div><a href="${messagesUrl}" style="color:#475569;text-decoration:none;">Messages</a></div>
                            <div><a href="${ordersUrl}" style="color:#475569;text-decoration:none;">Track orders</a></div>
                          </td>
                          <td valign="top" style="padding-right:16px;font-size:13px;line-height:1.8;color:#64748b;">
                            <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:8px;">Company</div>
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
              <td class="email-section" style="padding:0 32px 32px;font-size:12px;line-height:1.8;color:#8a8f98;">
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
