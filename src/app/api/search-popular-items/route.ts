import type { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http/response'
import {
  popularSearchItemQuerySchema,
} from '@/lib/search-popular/schema'
import {
  isMissingSearchPopularItemsTableError,
  listPublicPopularSearchItems,
} from '@/lib/search-popular/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const parsed = popularSearchItemQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return jsonError('Invalid query.', 400)
  }

  try {
    const items = await listPublicPopularSearchItems(parsed.data.limit)
    const response = jsonOk({ items })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error: any) {
    if (isMissingSearchPopularItemsTableError(error)) {
      const response = jsonOk({ items: [] })
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    console.error('search popular items list failed:', error?.message || error)
    return jsonError('Unable to load popular search items.', 500)
  }
}
