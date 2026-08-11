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
  heroIconSvg?: string
}

export const emailHeroIcons = {
  orderPlaced: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8l8-4 8 4-8 4-8-4z" stroke="#f5c451" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 8v8l8 4 8-4V8" stroke="#f5c451" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 12v8" stroke="#f5c451" stroke-width="1.6"/><path d="M9.5 10.5l3 1.5 3-1.5" stroke="#1a140d" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  truck: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h11v9H3z" stroke="#f5c451" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 10h4l3 3v3h-7z" stroke="#f5c451" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7.5" cy="18" r="1.6" stroke="#f5c451" stroke-width="1.4"/><circle cx="17.5" cy="18" r="1.6" stroke="#f5c451" stroke-width="1.4"/></svg>`,
  checkCircle: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#f5c451" stroke-width="1.6"/><path d="M8 12.5l2.6 2.6L16 9.5" stroke="#f5c451" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  alertCircle: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#f5c451" stroke-width="1.6"/><path d="M12 7.5v6" stroke="#f5c451" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.3" r="1" fill="#f5c451"/></svg>`,
  lockKey: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#f5c451" stroke-width="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#f5c451" stroke-width="1.6"/><circle cx="12" cy="15.2" r="1.4" fill="#f5c451"/></svg>`,
  magicLink: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 15L15 9" stroke="#f5c451" stroke-width="1.8" stroke-linecap="round"/><path d="M11 6l1-3 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" stroke="#f5c451" stroke-width="1.4" stroke-linejoin="round"/><rect x="4" y="14" width="6" height="6" rx="2" transform="rotate(-45 7 17)" stroke="#f5c451" stroke-width="1.6"/><rect x="14" y="4" width="6" height="6" rx="2" transform="rotate(-45 17 7)" stroke="#f5c451" stroke-width="1.6"/></svg>`,
  mailOpen: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8l8 5 8-5" stroke="#f5c451" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="3.5" y="6" width="17" height="12" rx="2" stroke="#f5c451" stroke-width="1.6"/></svg>`,
  storefront: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9l1-4h14l1 4" stroke="#f5c451" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" stroke="#f5c451" stroke-width="1.6"/><path d="M5 9v9h14V9" stroke="#f5c451" stroke-width="1.6"/><path d="M10 18v-5h4v5" stroke="#f5c451" stroke-width="1.6"/></svg>`,
  megaphone: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10v4h3l6 4V6l-6 4H3z" stroke="#f5c451" stroke-width="1.6" stroke-linejoin="round"/><path d="M17 9a4 4 0 0 1 0 6" stroke="#f5c451" stroke-width="1.6" stroke-linecap="round"/><path d="M9 15v3a2 2 0 0 0 4 0v-1" stroke="#f5c451" stroke-width="1.6" stroke-linecap="round"/></svg>`,
} as const

const ZIGZAG_HEIGHT = 18
const ZIGZAG_POINT_WIDTH = 24

const buildZigzagPoints = (widthPx: number) => {
  const points: string[] = []
  const steps = Math.ceil(widthPx / ZIGZAG_POINT_WIDTH) + 1
  for (let i = 0; i <= steps; i += 1) {
    const x = i * ZIGZAG_POINT_WIDTH
    const y = i % 2 === 0 ? 0 : ZIGZAG_HEIGHT
    points.push(`${x},${y}`)
  }
  points.push(`${steps * ZIGZAG_POINT_WIDTH},${ZIGZAG_HEIGHT + 4}`)
  points.push(`0,${ZIGZAG_HEIGHT + 4}`)
  return points.join(' ')
}

const zigzagDividerSvg = (fill: string) => {
  const width = 680
  return `<svg width="100%" height="${ZIGZAG_HEIGHT}" viewBox="0 0 ${width} ${ZIGZAG_HEIGHT + 4}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:${ZIGZAG_HEIGHT}px;">
    <polygon points="${buildZigzagPoints(width)}" fill="${fill}"></polygon>
  </svg>`
}

const socialIcons = [
  {
    label: 'Instagram',
    url: 'https://instagram.com/alxora',
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="#f3e9c9" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="#f3e9c9" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="#f3e9c9"/></svg>',
  },
  {
    label: 'X',
    url: 'https://x.com/alxora',
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4l16 16M20 4L4 20" stroke="#f3e9c9" stroke-width="1.6" stroke-linecap="round"/></svg>',
  },
  {
    label: 'Pinterest',
    url: 'https://pinterest.com/alxora',
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#f3e9c9" stroke-width="1.6"/><path d="M9.5 17c1-3 1.4-5.2 1.4-6.6a2 2 0 0 1 4 .1c0 1.2-.8 3.6-1.2 4.6-.3 1 .3 1.9 1.3 1.9 1.6 0 2.8-1.9 2.8-4.4 0-2.3-1.7-4.1-4.5-4.1-3 0-4.9 2.1-4.9 4.5 0 .8.3 1.4.6 1.9" stroke="#f3e9c9" stroke-width="1.4" stroke-linecap="round"/></svg>',
  },
]

const iconCircle = (svg: string, bg = '#1a140d') =>
  `<div style="width:40px;height:40px;border-radius:999px;background:${bg};display:flex;align-items:center;justify-content:center;">${svg}</div>`

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
  heroIconSvg,
}: EmailLayoutInput) => {
  const safePreview = escapeHtml(previewText)
  const safeHeading = escapeHtml(heading)
  const safeEyebrow = escapeHtml(eyebrow)
  const safeSubheading = escapeHtml(subheading)
  const safeAccentLabel = escapeHtml(accentLabel)
  const safeFooterText =
    safeText(footerText) || 'You are receiving this email because of activity on your Alxora account.'

  const siteBaseUrl = safeText(process.env.APP_BASE_URL) || 'https://alxora.com'
  const logoUrl = `${siteBaseUrl}/email/alxora-full-logo.png`
  const shopUrl = siteBaseUrl
  const helpUrl = `${siteBaseUrl}/help-center`
  const ordersUrl = `${siteBaseUrl}/account/orders`
  const messagesUrl = `${siteBaseUrl}/account/messages`
  const privacyUrl = `${siteBaseUrl}/privacy-policy`

  const ctaHtml =
    safeText(ctaLabel) && safeText(ctaUrl)
      ? `<tr>
          <td align="center" style="padding:4px 32px 30px;">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius:999px;background:#f5c451;">
                  <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:15px 30px;border-radius:999px;background:#f5c451;color:#1a140d;font-size:14px;font-weight:800;text-decoration:none;">
                    ${escapeHtml(ctaLabel)}
                  </a>
                </td>
              </tr>
            </table>
            ${
              safeText(secondaryCtaLabel) && safeText(secondaryCtaUrl)
                ? `<div style="margin-top:14px;">
                     <a href="${escapeHtml(secondaryCtaUrl)}" style="font-size:13px;font-weight:700;color:#f3e9c9;text-decoration:underline;">
                       ${escapeHtml(secondaryCtaLabel)}
                     </a>
                   </div>`
                : ''
            }
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

        .email-hero-heading {
          font-size: 26px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#efe9dc;font-family:Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a140d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-shell" style="background:#efe9dc;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="max-width:680px;background:#1a140d;overflow:hidden;">
            <tr>
              <td class="email-section" style="padding:26px 32px 8px;background:#1a140d;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td valign="middle" class="email-header-brand">
                      <img src="${logoUrl}" alt="Alxora" width="150" height="22" style="display:block;width:150px;max-width:100%;height:auto;" />
                    </td>
                    <td align="right" valign="middle" class="email-header-nav-cell">
                      <div style="font-size:12px;line-height:1.8;" class="email-header-nav">
                        <a href="${ordersUrl}" style="color:#f3e9c9;text-decoration:none;font-weight:700;margin-left:16px;">Orders</a>
                        <a href="${messagesUrl}" style="color:#f3e9c9;text-decoration:none;font-weight:700;margin-left:16px;">Messages</a>
                        <a href="${helpUrl}" style="color:#f3e9c9;text-decoration:none;font-weight:700;margin-left:16px;">Help</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" align="center" style="padding:26px 32px 30px;background:#1a140d;text-align:center;">
                ${
                  safeText(heroIconSvg)
                    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 20px;">
                        <tr>
                          <td align="center" valign="middle" style="width:72px;height:72px;border-radius:999px;background:radial-gradient(circle, #2c2418 0%, #1a140d 72%);">
                            ${heroIconSvg}
                          </td>
                        </tr>
                      </table>`
                    : ''
                }
                ${
                  safeText(eyebrow)
                    ? `<div style="font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#f5c451;margin-bottom:16px;">${safeEyebrow}</div>`
                    : ''
                }
                <h1 class="email-hero-heading" style="margin:0 0 12px;font-size:34px;line-height:1.2;font-weight:800;color:#ffffff;">${safeHeading}</h1>
                ${
                  safeText(subheading)
                    ? `<div style="max-width:460px;margin:0 auto;font-size:15px;line-height:1.7;color:#cbbfa8;">${safeSubheading}</div>`
                    : ''
                }
              </td>
            </tr>
            ${ctaHtml}
            ${
              safeText(summaryHtml)
                ? `<tr>
                    <td class="email-section" style="padding:0 32px 32px;background:#1a140d;">
                      <div style="background:#241c12;border-radius:14px;padding:22px 24px;">
                        ${
                          safeText(accentLabel)
                            ? `<div style="font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#f5c451;margin-bottom:14px;">${safeAccentLabel}</div>`
                            : ''
                        }
                        ${summaryHtml}
                      </div>
                    </td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="line-height:0;font-size:0;">${zigzagDividerSvg('#efe9dc')}</td>
            </tr>
            <tr>
              <td class="email-section" style="padding:30px 32px 20px;background:#efe9dc;font-size:15px;line-height:1.8;color:#3a3126;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="line-height:0;font-size:0;">${zigzagDividerSvg('#1a140d')}</td>
            </tr>
            <tr>
              <td class="email-section" style="padding:24px 32px 20px;background:#1a140d;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td valign="top" style="padding-right:16px;font-size:13px;line-height:1.9;color:#cbbfa8;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#f5c451;margin-bottom:10px;">Support</div>
                      <div><a href="${helpUrl}" style="color:#f3e9c9;text-decoration:none;">Help Center</a></div>
                      <div><a href="${messagesUrl}" style="color:#f3e9c9;text-decoration:none;">Messages</a></div>
                      <div><a href="${ordersUrl}" style="color:#f3e9c9;text-decoration:none;">Track orders</a></div>
                    </td>
                    <td valign="top" style="padding-right:16px;font-size:13px;line-height:1.9;color:#cbbfa8;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#f5c451;margin-bottom:10px;">Company</div>
                      <div><a href="${shopUrl}" style="color:#f3e9c9;text-decoration:none;">Shop Alxora</a></div>
                      <div><a href="${privacyUrl}" style="color:#f3e9c9;text-decoration:none;">Privacy Policy</a></div>
                      <div><a href="mailto:shopalxora@gmail.com" style="color:#f3e9c9;text-decoration:none;">shopalxora@gmail.com</a></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" align="center" style="padding:8px 32px 24px;background:#1a140d;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    ${socialIcons
                      .map(
                        (social) => `
                          <td style="padding:0 6px;">
                            <a href="${escapeHtml(social.url)}" aria-label="${escapeHtml(social.label)}">
                              ${iconCircle(social.svg)}
                            </a>
                          </td>
                        `,
                      )
                      .join('')}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-section" align="center" style="padding:0 32px 32px;font-size:12px;line-height:1.8;color:#8a8067;text-align:center;border-top:1px solid #2c2418;">
                <div style="padding-top:20px;">
                  ${escapeHtml(safeFooterText)}<br />
                  © ${new Date().getFullYear()} Alxora. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
