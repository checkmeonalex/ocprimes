import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jsonError, jsonOk } from '@/lib/http/response'
import { popularSearchItemInputSchema } from '@/lib/search-popular/schema'
import {
  createPopularSearchItem,
  isMissingSearchPopularItemsTableError,
  listAdminPopularSearchItems,
} from '@/lib/search-popular/service'

const MISSING_TABLE_MESSAGE =
  'Search popular items table not found. Run migration 086_search_popular_items.sql.'

export async function GET(request: NextRequest) {
  const { applyCookies, isAdmin } = await requireAdmin(request)
  if (!isAdmin) {
    return jsonError('Forbidden.', 403)
  }

  try {
    const items = await listAdminPopularSearchItems()
    const response = jsonOk({ items })
    applyCookies(response)
    return response
  } catch (error: any) {
    if (isMissingSearchPopularItemsTableError(error)) {
      const response = jsonOk({ items: [] })
      applyCookies(response)
      return response
    }

    console.error('admin search popular items list failed:', error?.message || error)
    return jsonError('Unable to load popular search items.', 500)
  }
}

export async function POST(request: NextRequest) {
  const { applyCookies, isAdmin, user } = await requireAdmin(request)
  if (!isAdmin || !user) {
    return jsonError('Forbidden.', 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = popularSearchItemInputSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || 'Invalid payload.', 400)
  }

  try {
    const item = await createPopularSearchItem(parsed.data)
    const response = jsonOk({ item }, 201)
    applyCookies(response)
    return response
  } catch (error: any) {
    if (isMissingSearchPopularItemsTableError(error)) {
      return jsonError(MISSING_TABLE_MESSAGE, 500)
    }

    console.error('admin search popular items create failed:', error?.message || error)
    return jsonError('Unable to save popular search item.', 500)
  }
}
