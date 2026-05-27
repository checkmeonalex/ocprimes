import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  popularSearchItemIdParamsSchema,
  popularSearchItemInputSchema,
} from '@/lib/search-popular/schema'
import {
  deletePopularSearchItem,
  isMissingSearchPopularItemsTableError,
  updatePopularSearchItem,
} from '@/lib/search-popular/service'

const MISSING_TABLE_MESSAGE =
  'Search popular items table not found. Run migration 086_search_popular_items.sql.'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { applyCookies, isAdmin, user } = await requireAdmin(request)
  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsedParams = popularSearchItemIdParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    return jsonError('Invalid item id.', 400)
  }

  const body = await request.json().catch(() => null)
  const parsedBody = popularSearchItemInputSchema.safeParse(body)
  if (!parsedBody.success) {
    return jsonError(parsedBody.error.issues[0]?.message || 'Invalid payload.', 400)
  }

  try {
    const item = await updatePopularSearchItem(parsedParams.data.id, parsedBody.data)
    const response = jsonOk({ item })
    applyCookies(response)
    return response
  } catch (error: any) {
    if (isMissingSearchPopularItemsTableError(error)) {
      return jsonError(MISSING_TABLE_MESSAGE, 500)
    }

    console.error('admin search popular items update failed:', error?.message || error)
    return jsonError('Unable to update popular search item.', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { applyCookies, isAdmin, user } = await requireAdmin(request)
  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const params = await context.params
  const parsedParams = popularSearchItemIdParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    return jsonError('Invalid item id.', 400)
  }

  try {
    await deletePopularSearchItem(parsedParams.data.id)
    const response = jsonOk({ success: true })
    applyCookies(response)
    return response
  } catch (error: any) {
    if (isMissingSearchPopularItemsTableError(error)) {
      return jsonError(MISSING_TABLE_MESSAGE, 500)
    }

    console.error('admin search popular items delete failed:', error?.message || error)
    return jsonError('Unable to delete popular search item.', 500)
  }
}
