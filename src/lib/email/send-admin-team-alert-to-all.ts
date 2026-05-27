import { buildAbsoluteUrl, safeText } from '@/lib/email/utils'
import { getEmailConfig } from '@/lib/email/config'
import { sendAdminTeamAlertEmail } from '@/lib/email/send-admin-team-alert-email'

type AdminTeamBroadcastInput = {
  adminDb: any
  heading: string
  subheading: string
  previewText: string
  accentLabel?: string
  summaryRows?: Array<{ label: string; value: string }>
  bodyTitle?: string
  bodyText?: string
  actionLabel?: string
  actionPath?: string
}

export const sendAdminTeamAlertToAll = async ({
  adminDb,
  heading,
  subheading,
  previewText,
  accentLabel,
  summaryRows,
  bodyTitle,
  bodyText,
  actionLabel,
  actionPath,
}: AdminTeamBroadcastInput) => {
  const { data: adminRows, error } = await adminDb.from('user_roles').select('user_id').eq('role', 'admin')
  if (error) {
    console.error('admin email recipients lookup failed:', error.message)
    return
  }

  const adminIds = Array.from(
    new Set(
      (Array.isArray(adminRows) ? adminRows : [])
        .map((row: { user_id?: string | null }) => String(row?.user_id || '').trim())
        .filter(Boolean),
    ),
  )
  if (!adminIds.length) return

  const config = getEmailConfig()
  const actionUrl = actionPath ? buildAbsoluteUrl(config.appBaseUrl, actionPath) : ''

  await Promise.all(
    adminIds.map(async (adminId) => {
      const userRes = await adminDb.auth.admin.getUserById(adminId)
      const email = safeText(userRes?.data?.user?.email)
      if (!email) return

      await sendAdminTeamAlertEmail({
        to: email,
        heading,
        subheading,
        previewText,
        accentLabel,
        summaryRows,
        bodyTitle,
        bodyText,
        actionLabel,
        actionUrl,
      })
    }),
  )
}
