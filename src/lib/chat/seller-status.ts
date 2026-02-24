import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
  calculateAverageSellerResponseMinutes,
  getLastSeenLabel,
  getSellerResponseLabel,
} from '@/lib/chat/presence'

const RESPONSE_SAMPLE_LIMIT = 200

const getLatestIso = (values: Array<string | null | undefined>) => {
  let latestMs = 0
  let latestIso: string | null = null

  values.forEach((value) => {
    const iso = String(value || '').trim()
    if (!iso) return
    const ms = new Date(iso).getTime()
    if (Number.isNaN(ms)) return
    if (ms > latestMs) {
      latestMs = ms
      latestIso = iso
    }
  })

  return latestIso
}

const getUserLastSeenAt = async (userId: string) => {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return null
  const adminDb = createAdminSupabaseClient()
  const { data, error } = await adminDb
    .from('user_presence')
    .select('last_seen_at')
    .eq('user_id', safeUserId)
    .maybeSingle()
  if (error || !data) return null
  const value = String(data.last_seen_at || '').trim()
  return value || null
}

const getSellerRecentChatActivityAt = async (conversationId: string, vendorUserId: string) => {
  const adminDb = createAdminSupabaseClient()
  const safeConversationId = String(conversationId || '').trim()
  const safeVendorUserId = String(vendorUserId || '').trim()
  if (!safeConversationId || !safeVendorUserId) return null

  const [sellerMessageRes, sellerReadRes] = await Promise.all([
    adminDb
      .from('chat_messages')
      .select('created_at')
      .eq('conversation_id', safeConversationId)
      .eq('sender_user_id', safeVendorUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminDb
      .from('chat_messages')
      .select('vendor_read_at')
      .eq('conversation_id', safeConversationId)
      .not('vendor_read_at', 'is', null)
      .order('vendor_read_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const latestSellerMessageAt = String(sellerMessageRes.data?.created_at || '').trim() || null
  const latestSellerReadAt = String(sellerReadRes.data?.vendor_read_at || '').trim() || null
  return getLatestIso([latestSellerMessageAt, latestSellerReadAt])
}

const getAverageSellerResponseMinutes = async (
  conversationId: string,
  customerUserId: string,
  vendorUserId: string,
) => {
  const adminDb = createAdminSupabaseClient()
  const safeConversationId = String(conversationId || '').trim()
  if (!safeConversationId) return null

  const { data, error } = await adminDb
    .from('chat_messages')
    .select('sender_user_id, created_at')
    .eq('conversation_id', safeConversationId)
    .order('created_at', { ascending: true })
    .limit(RESPONSE_SAMPLE_LIMIT)

  if (error || !Array.isArray(data)) return null

  return calculateAverageSellerResponseMinutes({
    messages: data.map((row: any) => ({
      senderUserId: String(row?.sender_user_id || ''),
      createdAt: String(row?.created_at || ''),
    })),
    customerUserId,
    vendorUserId,
  })
}

export const resolveSellerStatusForConversation = async ({
  conversationId,
  customerUserId,
  vendorUserId,
}: {
  conversationId: string
  customerUserId: string
  vendorUserId: string
}) => {
  const safeConversationId = String(conversationId || '').trim()
  const safeCustomerUserId = String(customerUserId || '').trim()
  const safeVendorUserId = String(vendorUserId || '').trim()

  if (!safeConversationId || !safeCustomerUserId || !safeVendorUserId) {
    return {
      sellerOnline: false,
      sellerStatusLabel: '',
      sellerLastActiveAt: null,
    }
  }

  const [sellerLastSeenAt, sellerRecentChatActivityAt, sellerAverageResponseMinutes] =
    await Promise.all([
      getUserLastSeenAt(safeVendorUserId),
      getSellerRecentChatActivityAt(safeConversationId, safeVendorUserId),
      getAverageSellerResponseMinutes(
        safeConversationId,
        safeCustomerUserId,
        safeVendorUserId,
      ),
    ])

  const sellerLastActiveAt = getLatestIso([sellerLastSeenAt, sellerRecentChatActivityAt])
  const sellerPresence = getLastSeenLabel({ lastActiveAt: sellerLastActiveAt })
  const sellerStatusLabel = getSellerResponseLabel({
    isOnline: sellerPresence.isOnline,
    averageResponseMinutes: sellerAverageResponseMinutes,
    lastActiveAt: sellerLastActiveAt,
  })

  return {
    sellerOnline: sellerPresence.isOnline,
    sellerStatusLabel,
    sellerLastActiveAt,
  }
}
