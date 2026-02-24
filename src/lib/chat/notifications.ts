import { createNotifications } from '@/lib/admin/notifications'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const safeText = (value: unknown) => String(value || '').trim()

const buildMessagesUrl = (conversationId: string, productId: string) => {
  const params = new URLSearchParams()
  if (conversationId) params.set('conversation', conversationId)
  if (productId) params.set('product', productId)
  const qs = params.toString()
  return qs ? `/backend/admin/messages?${qs}` : '/backend/admin/messages'
}

export const notifyVendorOnCustomerChatMessage = async ({
  conversation,
  senderUserId,
}: {
  conversation: any
  senderUserId: string
}) => {
  const customerUserId = safeText(conversation?.customer_user_id)
  const vendorUserId = safeText(conversation?.vendor_user_id)
  const conversationId = safeText(conversation?.id)
  const productId = safeText(conversation?.product_id)
  const senderUserIdSafe = safeText(senderUserId)

  if (!customerUserId || !vendorUserId || !conversationId) return
  if (senderUserIdSafe !== customerUserId) return
  if (vendorUserId === senderUserIdSafe) return

  const adminDb = createAdminSupabaseClient()

  const [productRes, customerRes] = await Promise.all([
    productId
      ? adminDb
          .from('products')
          .select('name')
          .eq('id', productId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    adminDb.auth.admin.getUserById(customerUserId),
  ])

  const productName = safeText(productRes?.data?.name) || 'a product'
  const customerEmail = safeText(customerRes?.data?.user?.email)
  const customerLabel = customerEmail || 'A customer'

  await createNotifications(adminDb, [
    {
      recipient_user_id: vendorUserId,
      recipient_role: 'vendor',
      title: 'New customer message',
      message: `${customerLabel} sent a message about ${productName}.`,
      type: 'chat_message_received',
      severity: 'info',
      entity_type: 'chat_conversation',
      entity_id: conversationId,
      metadata: {
        action_url: buildMessagesUrl(conversationId, productId),
        conversation_id: conversationId,
        product_id: productId,
        customer_user_id: customerUserId,
      },
      created_by: customerUserId,
    },
  ])
}
