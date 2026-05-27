import type { NextRequest } from 'next/server'
import { getPublicProduct } from '@/lib/catalog/product-route'

const readParams = async (context: { params: Promise<{ slug: string }> }) => {
  const params = await context.params
  return params.slug
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const slug = await readParams(context)
  return getPublicProduct(request, slug)
}
