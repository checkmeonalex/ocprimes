import { renderEmailLayout } from '@/emails/templates/layout'
import { escapeHtml, safeText } from '@/lib/email/utils'

type AuthActionSummaryRow = {
  label: string
  value: string
}

type RenderAuthActionEmailInput = {
  subject: string
  previewText: string
  eyebrow: string
  heading: string
  subheading: string
  greetingName?: string
  introText: string
  summaryRows?: AuthActionSummaryRow[]
  ctaLabel?: string
  ctaUrl?: string
  secondaryCtaLabel?: string
  secondaryCtaUrl?: string
  codeLabel?: string
  codeValue?: string
  bodyTitle?: string
  bodyText?: string
  footerText?: string
}

const renderSummaryHtml = (rows: AuthActionSummaryRow[]) => {
  if (!Array.isArray(rows) || rows.length === 0) return ''

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        ${rows
          .map(
            (row) => `
              <td style="padding-right:16px;vertical-align:top;">
                <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:8px;">${escapeHtml(row.label)}</div>
                <div style="font-size:18px;font-weight:800;color:#111827;line-height:1.5;">${escapeHtml(row.value)}</div>
              </td>
            `,
          )
          .join('')}
      </tr>
    </table>
  `
}

export const renderAuthActionEmail = ({
  subject,
  previewText,
  eyebrow,
  heading,
  subheading,
  greetingName,
  introText,
  summaryRows = [],
  ctaLabel,
  ctaUrl,
  secondaryCtaLabel,
  secondaryCtaUrl,
  codeLabel,
  codeValue,
  bodyTitle,
  bodyText,
  footerText,
}: RenderAuthActionEmailInput) => {
  const summaryHtml = renderSummaryHtml(summaryRows)

  const codeBlockHtml =
    safeText(codeLabel) && safeText(codeValue)
      ? `
        <div style="margin:0 0 20px;padding:20px 22px;background:#ffffff;border:1px solid #e7e1d4;text-align:center;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#8a8f98;margin-bottom:12px;">${escapeHtml(codeLabel)}</div>
          <div style="font-size:28px;font-weight:800;letter-spacing:0.24em;color:#111827;">${escapeHtml(codeValue)}</div>
        </div>
      `
      : ''

  const bodySectionHtml =
    safeText(bodyTitle) && safeText(bodyText)
      ? `
        <div style="padding:18px 20px;background:#fff8e7;border:1px solid #ead9a9;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8b6b16;margin-bottom:10px;">${escapeHtml(bodyTitle)}</div>
          <div style="font-size:15px;line-height:1.8;color:#475569;">${escapeHtml(bodyText)}</div>
        </div>
      `
      : ''

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:16px;">Hi ${escapeHtml(greetingName || 'there')},</p>
    <p style="margin:0 0 18px;font-size:16px;">${escapeHtml(introText)}</p>
    ${codeBlockHtml}
    ${bodySectionHtml}
  `

  const textParts = [
    `Hi ${greetingName || 'there'},`,
    introText,
  ]

  if (safeText(codeLabel) && safeText(codeValue)) {
    textParts.push(`${codeLabel}: ${codeValue}`)
  }
  if (safeText(bodyTitle) && safeText(bodyText)) {
    textParts.push(`${bodyTitle}: ${bodyText}`)
  }
  if (safeText(ctaLabel) && safeText(ctaUrl)) {
    textParts.push(`${ctaLabel}: ${ctaUrl}`)
  }

  return {
    subject,
    html: renderEmailLayout({
      previewText,
      eyebrow,
      heading,
      subheading,
      summaryHtml,
      accentLabel: summaryRows.length ? 'Details' : '',
      bodyHtml,
      ctaLabel,
      ctaUrl,
      secondaryCtaLabel,
      secondaryCtaUrl,
      footerText,
    }),
    text: textParts.join('\n\n'),
  }
}
