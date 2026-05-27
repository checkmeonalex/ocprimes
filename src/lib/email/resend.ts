import { getEmailConfig } from '@/lib/email/config'

type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

type ResendEmailPayload = {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
  reply_to?: string
}

export const sendTransactionalEmail = async ({ to, subject, html, text }: SendEmailInput) => {
  const config = getEmailConfig()
  if (!config.isConfigured) {
    console.warn('transactional email skipped: Resend config is incomplete')
    return { skipped: true as const }
  }

  const payload: ResendEmailPayload = {
    from: config.from,
    to: [to],
    subject,
    html,
    text,
  }

  if (config.replyTo) {
    payload.reply_to = config.replyTo
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Resend email failed with status ${response.status}${body ? `: ${body}` : ''}`)
  }

  return { skipped: false as const }
}
