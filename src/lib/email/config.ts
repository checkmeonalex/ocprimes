const safeText = (value: unknown) => String(value || '').trim()

export const getEmailConfig = () => {
  const apiKey = safeText(process.env.RESEND_API_KEY)
  const from = safeText(process.env.EMAIL_FROM)
  const replyTo = safeText(process.env.EMAIL_REPLY_TO)
  const appBaseUrl =
    safeText(process.env.APP_BASE_URL) || safeText(process.env.NEXT_PUBLIC_SITE_URL)

  return {
    apiKey,
    from,
    replyTo,
    appBaseUrl,
    isConfigured: Boolean(apiKey && from && appBaseUrl),
  }
}
