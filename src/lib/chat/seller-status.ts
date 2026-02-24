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

const getUserLastSignInAt = async (userId: string) => {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return null
  const adminDb = createAdminSupabaseClient()
  const { data, error } = await adminDb.auth.admin.getUserById(safeUserId)
  if (error || !data?.user?.id) return null
  const value = String(data.user.last_sign_in_at || '').trim()
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

  const [sellerLastSignInAt, sellerRecentChatActivityAt, sellerAverageResponseMinutes] =
    await Promise.all([
      getUserLastSignInAt(safeVendorUserId),
      getSellerRecentChatActivityAt(safeConversationId, safeVendorUserId),
      getAverageSellerResponseMinutes(
        safeConversationId,
        safeCustomerUserId,
        safeVendorUserId,
      ),
    ])

  const sellerLastActiveAt = getLatestIso([sellerLastSignInAt, sellerRecentChatActivityAt])
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
