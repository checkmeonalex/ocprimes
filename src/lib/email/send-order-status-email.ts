import { renderOrderStatusEmail } from '@/emails/templates/order-status'
import type { EmailOrderBreakdown } from '@/lib/email/order-breakdown'
import { getCustomerOrderStatusLabel, getCustomerOrderStatusMessage } from '@/lib/orders/customer-status'
import { getEmailConfig } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { buildAbsoluteUrl, safeText } from '@/lib/email/utils'

type SendOrderStatusEmailInput = {
  to: string
  customerName: string
  orderId: string
  orderNumberLabel: string
  status: string
  breakdown?: EmailOrderBreakdown | null
}

export const sendOrderStatusEmail = async ({
  to,
  customerName,
  orderId,
  orderNumberLabel,
  status,
  breakdown,
}: SendOrderStatusEmailInput) => {
  const config = getEmailConfig()
  const orderUrl = buildAbsoluteUrl(config.appBaseUrl, `/account/orders/${encodeURIComponent(orderId)}`)
  const statusLabel = getCustomerOrderStatusLabel(status)
  const statusMessage = getCustomerOrderStatusMessage(status)
  const email = renderOrderStatusEmail({
    customerName: safeText(customerName) || 'there',
    orderNumberLabel,
    status,
    statusLabel,
    statusMessage,
    orderUrl,
    breakdown: breakdown || undefined,
  })

  await sendTransactionalEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}
