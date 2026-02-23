import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { chatMessageCreateSchema, chatMessagesQuerySchema } from '@/lib/chat/schema'
import {
  getConversationForUser,
  insertConversationMessage,
  listMessagesForConversation,
  toChatConversationPayload,
  toChatMessagePayload,
} from '@/lib/chat/chat-server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const { conversationId } = await context.params
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const conversationResult = await getConversationForUser(
      supabase,
      conversationId,
      auth.user.id,
    )

    if (conversationResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!conversationResult.data?.id) {
      return jsonError('Conversation not found.', 404)
    }

    const queryParse = chatMessagesQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') || undefined,
    })

    if (!queryParse.success) {
      return jsonError('Invalid message query.', 400)
    }

    const messagesResult = await listMessagesForConversation(
      supabase,
      conversationId,
      queryParse.data.limit,
    )

    if (messagesResult.error) {
      return jsonError('Unable to load messages.', 500)
    }

    const response = jsonOk({
      currentUserId: auth.user.id,
      conversation: toChatConversationPayload(conversationResult.data),
      messages: messagesResult.data.map((row) => toChatMessagePayload(row, auth.user.id)),
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat messages get failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
    const { data: auth, error: authError } = await supabase.auth.getUser()

    if (authError || !auth.user) {
      return jsonError('Unauthorized.', 401)
    }

    const { conversationId } = await context.params
    if (!conversationId) {
      return jsonError('Missing conversation.', 400)
    }

    const conversationResult = await getConversationForUser(
      supabase,
      conversationId,
      auth.user.id,
    )

    if (conversationResult.error) {
      return jsonError('Unable to load conversation.', 500)
    }

    if (!conversationResult.data?.id) {
      return jsonError('Conversation not found.', 404)
    }

    const body = await request.json().catch(() => null)
    const parsed = chatMessageCreateSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid message payload.', 400)
    }

    const insertResult = await insertConversationMessage(
      supabase,
      conversationId,
      auth.user.id,
      parsed.data.body,
    )

    if (insertResult.error || !insertResult.data?.id) {
      return jsonError('Unable to send message.', 500)
    }

    const response = jsonOk({
      currentUserId: auth.user.id,
      message: toChatMessagePayload(insertResult.data, auth.user.id),
      conversation: toChatConversationPayload(conversationResult.data),
    })
    applyCookies(response)
    return response
  } catch (error) {
    console.error('chat messages post failed:', error)
    return jsonError('Chat service unavailable.', 503)
  }
}
