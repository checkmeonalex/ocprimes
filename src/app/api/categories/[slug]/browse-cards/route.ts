import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  getCachedBrowseCardsByCategorySlug,
  HOME_BROWSE_CARDS_REVALIDATE_SECONDS,
} from '@/lib/catalog/home-browse-cards-server'
import { getCachedHomeBrowseCards } from '@/lib/home/browse-cards'
import { jsonError, jsonOk } from '@/lib/http/response'

const paramsSchema = z.object({
  slug: z.string().min(1),
})

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params
  const parsed = paramsSchema.safeParse(params || {})
  if (!parsed.success) return jsonError('Invalid category slug.', 400)

  const slug = String(parsed.data.slug || '').trim().toLowerCase()
  const payload =
    slug === 'home'
      ? await getCachedHomeBrowseCards()
      : await getCachedBrowseCardsByCategorySlug(slug)

  const response = jsonOk(payload)
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${HOME_BROWSE_CARDS_REVALIDATE_SECONDS}, stale-while-revalidate=300`,
  )
  return response
}
