import type { NextRequest } from 'next/server'
import { getPublicProductSizeGuide } from '@/lib/catalog/size-guide-route'

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const params = await context.params
  return getPublicProductSizeGuide(request, params?.slug)
}
