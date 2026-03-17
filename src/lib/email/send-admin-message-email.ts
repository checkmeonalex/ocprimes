import { renderAdminMessageAlertEmail } from '@/emails/templates/admin-message-alert'
import { getEmailConfig } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { buildAbsoluteUrl, safeText, stripHtml, truncateText } from '@/lib/email/utils'

type SendAdminMessageEmailInput = {
  to: string
  customerName: string
  senderLabel: string
  conversationId: string
  previewBody: string
  productName?: string
}

export const sendAdminMessageEmail = async ({
  to,
  customerName,
  senderLabel,
  conversationId,
  previewBody,
  productName,
}: SendAdminMessageEmailInput) => {
  const config = getEmailConfig()
  const previewText =
    truncateText(stripHtml(previewBody), 180) || 'Open Alxora to read the latest message.'
  const messagesUrl = buildAbsoluteUrl(
    config.appBaseUrl,
    `/UserBackend/messages?conversation=${encodeURIComponent(conversationId)}`,
  )

  const email = renderAdminMessageAlertEmail({
    customerName: safeText(customerName) || 'there',
    senderLabel: safeText(senderLabel) || 'Alxora support',
    previewText,
    messagesUrl,
    productName: safeText(productName),
  })

  await sendTransactionalEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}
