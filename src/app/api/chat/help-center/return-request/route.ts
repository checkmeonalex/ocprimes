import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { findOrCreateDashboardHelpCenterConversation } from '@/lib/chat/dashboard'
import { getConversationClosureState, reopenConversation } from '@/lib/chat/conversation-closure'
import { chatHelpCenterReturnRequestSchema } from '@/lib/chat/schema'
import { composeInquiryMessageBody } from '@/lib/chat/inquiry-message'
import { getConversationForUser, insertConversationMessage } from '@/lib/chat/chat-server'
import { notifyVendorOnCustomerChatMessage } from '@/lib/chat/notifications'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  buildObjectKey,
  uploadToR2,
} from '@/lib/storage/r2'

const RETURN_REASON_LABELS: Record<string, string> = {
  defective_item: 'Defective item',
  wrong_item: 'Wrong item delivered',
  missing_parts: 'Missing parts or items',
  not_as_described: 'Item not as described',
  changed_mind: 'Changed my mind',
  delivery_issue: 'Delivery issue',
  other: 'Other return reason',
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const roleInfo = await getUserRoleInfoSafe(supabase, auth.user.id, auth.user.email || '')
    if (roleInfo.isAdmin) {
      return jsonError('Admin cannot open Help Center with self.', 403)
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return jsonError('Invalid return request payload.', 400)
    }

    const readText = (value: FormDataEntryValue | null) => String(value || '').trim()
    const rawItemReports = (() => {
      const value = String(formData.get('itemReports') || '').trim()
      if (!value) return []
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : null
      } catch {
        return null
      }
    })()
    if (rawItemReports === null) {
      return jsonError('Invalid return reason payload.', 400)
    }

    const parsed = chatHelpCenterReturnRequestSchema.safeParse({
      orderId: readText(formData.get('orderId')),
      itemIds: formData
        .getAll('itemIds')
        .map((itemId) => String(itemId || '').trim())
        .filter(Boolean),
      orderNumber: readText(formData.get('orderNumber')),
      trackId: readText(formData.get('trackId')),
      orderStatus: readText(formData.get('orderStatus')),
      itemReports: rawItemReports,
    })
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || 'Invalid return request payload.', 400)
    }

    const payload = parsed.data
    const fileEntries = formData.getAll('files')
    const files = fileEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0)
    if (files.length > 6) {
      return jsonError('You can upload up to 6 files.', 400)
    }

    const imageUrls: string[] = []
    const videoUrls: string[] = []
    for (const file of files) {
      const mediaType = String(file.type || '').toLowerCase()
      const isImage = ALLOWED_IMAGE_TYPES.has(mediaType)
      const isVideo = ALLOWED_VIDEO_TYPES.has(mediaType)
      if (!isImage && !isVideo) {
        return jsonError('Unsupported media type.', 415)
      }
      if (isImage && file.size > MAX_UPLOAD_BYTES) {
        return jsonError('Image file too large.', 413)
      }
      if (isVideo && file.size > MAX_VIDEO_UPLOAD_BYTES) {
        return jsonError('Video file too large.', 413)
      }
      const key = buildObjectKey(file, `help-center/returns/${auth.user.id}/${payload.orderId}`)
      let uploaded
      try {
        uploaded = await uploadToR2(file, key)
      } catch (uploadError) {
        console.error('chat return request media upload failed:', uploadError)
        return jsonError('Unable to upload return media.', 500)
      }
      if (isImage) imageUrls.push(String(uploaded?.url || '').trim())
      if (isVideo) videoUrls.push(String(uploaded?.url || '').trim())
    }

    const { data: orderRow, error: orderError } = await supabase
      .from('checkout_orders')
      .select('id, order_number, payment_status, paystack_reference')
      .eq('id', payload.orderId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (orderError) {
      return jsonError('Unable to verify order details.', 500)
    }
    if (!orderRow?.id) {
      return jsonError('Order not found.', 404)
    }

    const requestedItemIds = Array.from(
      new Set(
        (Array.isArray(payload.itemIds) ? payload.itemIds : [])
          .map((itemId) => String(itemId || '').trim())
          .filter(Boolean),
      ),
    )
    const { data: itemRows, error: itemError } = await supabase
      .from('checkout_order_items')
      .select('id, name')
      .in('id', requestedItemIds)
      .eq('order_id', orderRow.id)
      .order('created_at', { ascending: true })

    if (itemError) {
      return jsonError('Unable to verify item details.', 500)
    }
    const safeItemRows = Array.isArray(itemRows) ? itemRows : []
    if (!safeItemRows.length || safeItemRows.length !== requestedItemIds.length) {
      return jsonError('Order item not found.', 404)
    }

    const itemReportsMap = new Map<
      string,
      {
        reasonLabels: string[]
        typedReason: string
      }
    >()
    ;(Array.isArray(payload.itemReports) ? payload.itemReports : []).forEach((itemReport) => {
      const itemId = String(itemReport?.itemId || '').trim()
      if (!itemId || !requestedItemIds.includes(itemId)) return
      const reasonLabels = Array.from(
        new Set(
          (Array.isArray(itemReport?.reasonKeys) ? itemReport.reasonKeys : [])
            .map((reasonKey) => RETURN_REASON_LABELS[String(reasonKey || '').trim()] || '')
            .filter(Boolean),
        ),
      )
      const typedReason = String(itemReport?.customReason || '').trim()
      itemReportsMap.set(itemId, {
        reasonLabels,
        typedReason,
      })
    })

    const missingReasonItem = requestedItemIds.find((itemId) => {
      const issue = itemReportsMap.get(itemId)
      if (!issue) return true
      return issue.reasonLabels.length === 0 && !issue.typedReason
    })
    if (missingReasonItem) {
      return jsonError('Select at least one reason or type a reason for each selected product.', 400)
    }

    const conversationResult = await findOrCreateDashboardHelpCenterConversation(auth.user.id)
    if (conversationResult.error || !conversationResult.data?.id) {
      return jsonError('Unable to initialize Help Center chat.', 500)
    }

    let closure = getConversationClosureState({
      conversation: conversationResult.data,
      isAdmin: false,
    })
    if (closure.isClosed || !closure.canSend || !closure.canView) {
      const reopenResult = await reopenConversation({
        conversationId: String(conversationResult.data.id || ''),
      })
      if (!reopenResult.error) {
        closure = getConversationClosureState({
          conversation: {
            ...conversationResult.data,
            closedAt: null,
            closed_at: null,
            closedReason: '',
            closed_reason: '',
          },
          isAdmin: false,
        })
      }
    }
    if (!closure.canSend) {
      return jsonError(
        closure.participantNotice || 'This chat is closed. You can no longer send messages.',
        403,
      )
    }

    const itemDetails = safeItemRows.map((itemRow) => {
      const itemId = String(itemRow?.id || '').trim()
      const itemName = String(itemRow?.name || '').trim() || `Item ${itemId}`
      const issue = itemReportsMap.get(itemId)
      const lines = [`• ${itemName}`]
      if (issue?.reasonLabels?.length) {
        lines.push(`Reasons: ${issue.reasonLabels.join(', ')}`)
      }
      if (issue?.typedReason) {
        lines.push(`Note: ${issue.typedReason}`)
      }
      return {
        itemName,
        lines: lines.join('\n'),
      }
    })
    const itemNames = itemDetails.map((item) => item.itemName)
    const itemLines = itemDetails.map((item) => item.lines).join('\n--------------------\n')
    const allReasonLabels = Array.from(new Set(Array.from(itemReportsMap.values()).flatMap((item) => item.reasonLabels)))
    const mediaLines = [
      ...imageUrls.map((url) => `- Image: ${url}`),
      ...videoUrls.map((url) => `- Video: ${url}`),
    ]
    const messageText = [
      itemNames.length > 1 ? 'I want to return these products:' : 'I want to return this product:',
      itemLines,
      mediaLines.length > 0 ? 'Attachments:' : '',
      mediaLines.length > 0 ? mediaLines.join('\n') : '',
    ]
      .filter(Boolean)
      .join('\n')

    const composedMessage = composeInquiryMessageBody({
      text: messageText,
      detailLabel: 'Question',
      inquiryContext: {
        orderId: String(orderRow.id || ''),
        orderNumber: String(payload.orderNumber || orderRow.order_number || '').trim(),
        trackId: String(payload.trackId || orderRow.paystack_reference || '').trim(),
        orderStatus: String(payload.orderStatus || orderRow.payment_status || '').trim(),
        reportReasonLabel: allReasonLabels.length
          ? `Return request - ${allReasonLabels.join(', ')}`
          : 'Return request',
      },
    })

    const insertResult = await insertConversationMessage(
      supabase,
      String(conversationResult.data.id),
      auth.user.id,
      composedMessage,
    )

    if (insertResult.error || !insertResult.data?.id) {
      return jsonError('Unable to send return request.', 500)
    }

    try {
      const conversationForNotify = await getConversationForUser(
        supabase,
        String(conversationResult.data.id),
        auth.user.id,
      )
      if (conversationForNotify?.data?.id) {
        await notifyVendorOnCustomerChatMessage({
          conversation: conversationForNotify.data,
          senderUserId: auth.user.id,
        })
      }
    } catch (notificationError) {
      console.error('chat return request notification failed:', notificationError)
    }

    const response = jsonOk({
      conversationId: String(conversationResult.data.id),
      messageId: String(insertResult.data.id),
      reasonLabel: allReasonLabels.join(', '),
      itemNames,
      imageCount: imageUrls.length,
      videoCount: videoUrls.length,
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat help-center return-request post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
