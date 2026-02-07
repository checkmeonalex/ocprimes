import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return jsonError('You must be signed in.', 401)
  }

  const { id: itemId } = await context.params
  const { error: deleteError } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', itemId)

  if (deleteError) {
    console.error('Wishlist item delete failed:', deleteError.message)
    return jsonError('Unable to remove item.', 500)
  }

  const response = jsonOk({ success: true })
  applyCookies(response)
  return response
}
