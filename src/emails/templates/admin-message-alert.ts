import { renderEmailLayout } from '@/emails/templates/layout'
import { escapeHtml } from '@/lib/email/utils'

type AdminMessageAlertEmailInput = {
  customerName: string
  senderLabel: string
  previewText: string
  messagesUrl: string
  productName?: string
}

export const renderAdminMessageAlertEmail = ({
  customerName,
  senderLabel,
  previewText,
  messagesUrl,
  productName,
}: AdminMessageAlertEmailInput) => {
  const topicLabel = productName ? `about ${productName}` : 'on Alxora'
  const summaryHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding-right:16px;vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">From</div>
          <div style="font-size:20px;font-weight:800;color:#0f172a;">${escapeHtml(senderLabel)}</div>
        </td>
        <td style="vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Topic</div>
          <div style="font-size:15px;font-weight:700;color:#475569;">${escapeHtml(productName || 'Your Alxora conversation')}</div>
        </td>
      </tr>
    </table>
  `

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:16px;">Hi ${escapeHtml(customerName || 'there')},</p>
    <p style="margin:0 0 18px;font-size:16px;">
      ${escapeHtml(senderLabel)} sent you a new message ${escapeHtml(topicLabel)}.
    </p>
    <div style="margin:0 0 20px;padding:20px 22px;border-radius:24px;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);border:1px solid rgba(148,163,184,0.24);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7);">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">Message preview</div>
      <div style="font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(previewText)}</div>
    </div>
    <div style="padding:18px 20px;border-radius:22px;background:linear-gradient(180deg,#fff7df 0%,#fff 100%);border:1px solid rgba(225,208,131,0.34);">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8b6b16;margin-bottom:10px;">Next step</div>
      <div style="font-size:15px;line-height:1.8;color:#475569;">Open your messages to reply, continue the conversation, or review the full context.</div>
    </div>
  `

  const text = [
    `Hi ${customerName || 'there'},`,
    `${senderLabel} sent you a new message ${topicLabel}.`,
    `Preview: ${previewText}`,
    `Open messages: ${messagesUrl}`,
  ].join('\n\n')

  return {
    subject: `${senderLabel} sent you a new message on Alxora`,
    html: renderEmailLayout({
      previewText,
      headerNote: 'ALXORA SUPPORT DESK',
      eyebrow: 'Admin Message',
      heading: 'You have a new message',
      subheading:
        'Important account and order support conversations are surfaced here with a quick preview so you can jump back in without searching for the thread.',
      summaryHtml,
      accentLabel: 'Conversation Snapshot',
      bodyHtml,
      ctaLabel: 'Open messages',
      ctaUrl: messagesUrl,
    }),
    text,
  }
}
