import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/admin/notifications'
import { chatHelpCenterReportSchema } from '@/lib/chat/schema'
import { findOrCreateDashboardHelpCenterConversation } from '@/lib/chat/dashboard'
import { insertConversationMessage } from '@/lib/chat/chat-server'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { sendAdminTeamAlertToAll } from '@/lib/email/send-admin-team-alert-to-all'
import { enforceRateLimit } from '@/lib/security/rate-limit'

const REPORT_REASON_LABELS: Record<string, string> = {
  fraudulent_activity: 'Fraudulent activity',
  misleading_information: 'Misleading information',
  wrong_or_fake_product: 'Wrong or fake product',
  poor_quality_or_damaged: 'Poor quality or damaged item',
  abusive_or_threatening_behavior: 'Abusive or threatening behavior',
  high_pricing: 'High pricing',
  scam: 'Scam',
  other: 'Other',
}

export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, {
      key: 'chat-help-center-report',
      max: 5,
      windowMs: 60_000,
      message: 'Too many reports. Please wait a minute and try again.',
    })
    if (limited) return limited

    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    if (roleInfo.isAdmin) {
      return jsonError('Admin cannot report via Help Center.', 403)
    }

    const body = await request.json().catch(() => null)
    const parsed = chatHelpCenterReportSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid report payload.', 400)
    }

    const reason = parsed.data.reason
    const reasonLabel = REPORT_REASON_LABELS[reason] || 'Other'
    const sellerName = String(parsed.data.reportedSellerName || '').trim()
    const sourceConversationId = String(parsed.data.sourceConversationId || '').trim()
    const productId = String(parsed.data.productId || '').trim()
    const otherDetails = String(parsed.data.otherDetails || '').trim()
    const conversationUrl = sourceConversationId
      ? `/backend/admin/messages?conversation=${encodeURIComponent(sourceConversationId)}`
      : ''
    let productUrl = ''

    if (reason === 'other' && !otherDetails) {
      return jsonError('Please describe the issue.', 400)
    }
    if (productId) {
      const productLookup = await supabase
        .from('products')
        .select('slug')
        .eq('id', productId)
        .maybeSingle()
      const productSlug = String(productLookup.data?.slug || '').trim()
      if (productSlug) {
        productUrl = `/product/${encodeURIComponent(productSlug)}`
      }
    }

    const helpCenterResult = await findOrCreateDashboardHelpCenterConversation(auth.user.id)
    if (helpCenterResult.error || !helpCenterResult.data?.id) {
      return jsonError('Unable to connect Help Center.', 500)
    }

    const lines = [
      'Support Report',
      'A user submitted a chat report.',
      `Reason: ${reasonLabel}`,
      `Reported seller: ${sellerName}`,
      productId ? `Product ID: ${productId}` : '',
      sourceConversationId ? `Source chat ID: ${sourceConversationId}` : '',
      conversationUrl ? `Conversation URL: ${conversationUrl}` : '',
      productUrl ? `Product URL: ${productUrl}` : '',
      otherDetails ? `Details: ${otherDetails}` : '',
    ].filter(Boolean)
    const reportBody = lines.join('\n')

    const insertResult = await insertConversationMessage(
      supabase,
      String(helpCenterResult.data.id || '').trim(),
      auth.user.id,
      reportBody,
    )
    if (insertResult.error || !insertResult.data?.id) {
      return jsonError('Unable to send report.', 500)
    }

    const adminDb = createAdminSupabaseClient()
    await notifyAllAdmins(adminDb, {
      title: `New support report: ${reasonLabel}`,
      message: `A customer submitted a report through Help Center.`,
      type: 'support_report',
      severity: 'warning',
      entityType: 'chat_conversation',
      entityId: String(helpCenterResult.data.id || '').trim(),
      metadata: {
        reason: reason,
        reason_label: reasonLabel,
        source_conversation_id: sourceConversationId,
        action_url: `/backend/admin/messages?conversation=${encodeURIComponent(String(helpCenterResult.data.id || '').trim())}`,
      },
      createdBy: String(auth.user.id || ''),
    })
    try {
      await sendAdminTeamAlertToAll({
        adminDb,
        heading: `New support report: ${reasonLabel}`,
        subheading: 'A customer sent a report to Help Center and may need review.',
        previewText: `Support report: ${reasonLabel}`,
        accentLabel: 'Report details',
        summaryRows: [
          { label: 'Reason', value: reasonLabel },
          { label: 'Seller', value: sellerName || 'Not provided' },
        ],
        bodyTitle: 'What happened',
        bodyText: otherDetails || 'A customer submitted a new report through Help Center.',
        actionLabel: 'Open report',
        actionPath: `/backend/admin/messages?conversation=${encodeURIComponent(String(helpCenterResult.data.id || '').trim())}`,
      })
    } catch (emailError) {
      console.error('admin support report email failed:', emailError)
    }

    const response = jsonOk({
      sent: true,
      conversationId: String(helpCenterResult.data.id || '').trim(),
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat help center report post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
