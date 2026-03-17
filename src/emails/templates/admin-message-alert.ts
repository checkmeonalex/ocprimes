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
  const normalizedTopic = String(productName || '')
    .replace(/\s*\(system\)\s*/gi, '')
    .trim()
  const topicLabel = normalizedTopic || 'your support conversation'
  const summaryHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding-right:16px;vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:8px;">From</div>
          <div style="font-size:18px;font-weight:800;color:#111827;">${escapeHtml(senderLabel)}</div>
        </td>
        <td style="vertical-align:top;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8f98;margin-bottom:8px;">Conversation</div>
          <div style="font-size:15px;font-weight:700;color:#475569;">${escapeHtml(topicLabel)}</div>
        </td>
      </tr>
    </table>
  `

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:16px;">Hi ${escapeHtml(customerName || 'there')},</p>
    <p style="margin:0 0 18px;font-size:16px;">
      ${escapeHtml(senderLabel)} sent you a new message on Alxora.
    </p>
    <div style="margin:0 0 20px;padding:20px 22px;background:#ffffff;border:1px solid #e7e1d4;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#8a8f98;margin-bottom:10px;">Message preview</div>
      <div style="font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(previewText)}</div>
    </div>
    <div style="padding:18px 20px;background:#fff8e7;border:1px solid #ead9a9;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8b6b16;margin-bottom:10px;">What happens next</div>
      <div style="font-size:15px;line-height:1.8;color:#475569;">Open your messages to reply, continue the conversation, or review the full context.</div>
    </div>
  `

  const text = [
    `Hi ${customerName || 'there'},`,
    `${senderLabel} sent you a new message on Alxora.`,
    `Conversation: ${topicLabel}`,
    `Preview: ${previewText}`,
    `Open messages: ${messagesUrl}`,
  ].join('\n\n')

  return {
    subject: `${senderLabel} sent you a new message on Alxora`,
    html: renderEmailLayout({
      previewText,
      eyebrow: 'Message Update',
      heading: 'You have a new message',
      subheading: 'A new support update is waiting for you. Open your messages to reply or continue the conversation.',
      summaryHtml,
      accentLabel: 'Conversation details',
      bodyHtml,
      ctaLabel: 'Open messages',
      ctaUrl: messagesUrl,
    }),
    text,
  }
}
