import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const DASHBOARD_CONVERSATION_COLUMNS =
  'id, customer_user_id, vendor_user_id, product_id, created_at, updated_at, last_message_at, last_message_preview'

const DASHBOARD_MESSAGE_COLUMNS =
  'id, conversation_id, sender_user_id, body, created_at'

const formatIso = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

const safeText = (value: unknown, fallback = '') => String(value || fallback).trim()

const fallbackUserLabel = (userId: string) => {
  if (!userId) return 'Unknown user'
  return `User ${userId.slice(0, 8)}`
}

export const loadUserEmailMap = async (userIds: string[]) => {
  const adminDb = createAdminSupabaseClient()
  const uniqueIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)))
  const emailMap = new Map<string, string>()

  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const { data, error } = await adminDb.auth.admin.getUserById(userId)
        if (error || !data?.user?.id) return
        const email = safeText(data.user.email)
        if (!email) return
        emailMap.set(String(data.user.id), email)
      } catch {
        // Ignore single-user lookup failures and keep fallback labels.
      }
    }),
  )

  return emailMap
}

export const listDashboardConversations = async () => {
  const adminDb = createAdminSupabaseClient()

  const { data, error } = await adminDb
    .from('chat_conversations')
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(300)

  if (error) {
    return { data: [], error }
  }

  const conversations = Array.isArray(data) ? data : []
  const emailMap = await loadUserEmailMap(
    conversations.flatMap((row: any) => [String(row?.customer_user_id || ''), String(row?.vendor_user_id || '')]),
  )

  const mapped = conversations.map((row: any) => {
    const customerUserId = safeText(row?.customer_user_id)
    const vendorUserId = safeText(row?.vendor_user_id)

    return {
      id: safeText(row?.id),
      customerUserId,
      vendorUserId,
      customerEmail: emailMap.get(customerUserId) || fallbackUserLabel(customerUserId),
      vendorEmail: emailMap.get(vendorUserId) || fallbackUserLabel(vendorUserId),
      productId: safeText(row?.product_id),
      createdAt: formatIso(row?.created_at),
      updatedAt: formatIso(row?.updated_at),
      lastMessageAt: formatIso(row?.last_message_at),
      lastMessagePreview: safeText(row?.last_message_preview),
      unreadCount: 0,
    }
  })

  return { data: mapped, error: null }
}

export const getDashboardConversationById = async (conversationId: string) => {
  const adminDb = createAdminSupabaseClient()

  const { data, error } = await adminDb
    .from('chat_conversations')
    .select(DASHBOARD_CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  if (!data?.id) {
    return { data: null, error: null }
  }

  const customerUserId = safeText(data.customer_user_id)
  const vendorUserId = safeText(data.vendor_user_id)
  const emailMap = await loadUserEmailMap([customerUserId, vendorUserId])

  return {
    data: {
      id: safeText(data.id),
      customerUserId,
      vendorUserId,
      customerEmail: emailMap.get(customerUserId) || fallbackUserLabel(customerUserId),
      vendorEmail: emailMap.get(vendorUserId) || fallbackUserLabel(vendorUserId),
      productId: safeText(data.product_id),
      createdAt: formatIso(data.created_at),
      updatedAt: formatIso(data.updated_at),
      lastMessageAt: formatIso(data.last_message_at),
      lastMessagePreview: safeText(data.last_message_preview),
      unreadCount: 0,
    },
    error: null,
  }
}

export const listDashboardMessages = async (conversationId: string, limit = 200) => {
  const adminDb = createAdminSupabaseClient()
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 200))

  const { data, error } = await adminDb
    .from('chat_messages')
    .select(DASHBOARD_MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    return { data: [], error }
  }

  const messages = Array.isArray(data) ? [...data].reverse() : []
  const emailMap = await loadUserEmailMap(messages.map((row: any) => String(row?.sender_user_id || '')))

  return {
    data: messages.map((row: any) => {
      const senderUserId = safeText(row?.sender_user_id)
      return {
        id: safeText(row?.id),
        conversationId: safeText(row?.conversation_id),
        senderUserId,
        senderEmail: emailMap.get(senderUserId) || fallbackUserLabel(senderUserId),
        body: safeText(row?.body),
        createdAt: formatIso(row?.created_at),
      }
    }),
    error: null,
  }
}

export const insertDashboardMessage = async (
  conversationId: string,
  senderUserId: string,
  body: string,
) => {
  const adminDb = createAdminSupabaseClient()

  const { data, error } = await adminDb
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: senderUserId,
      body,
    })
    .select(DASHBOARD_MESSAGE_COLUMNS)
    .single()

  if (error || !data?.id) {
    return { data: null, error }
  }

  const emailMap = await loadUserEmailMap([String(data.sender_user_id || '')])
  const senderUserIdSafe = safeText(data.sender_user_id)

  return {
    data: {
      id: safeText(data.id),
      conversationId: safeText(data.conversation_id),
      senderUserId: senderUserIdSafe,
      senderEmail: emailMap.get(senderUserIdSafe) || fallbackUserLabel(senderUserIdSafe),
      body: safeText(data.body),
      createdAt: formatIso(data.created_at),
    },
    error: null,
  }
}
