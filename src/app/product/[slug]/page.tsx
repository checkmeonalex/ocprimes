import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadPublicProductItem } from '@/lib/catalog/product-route'
import ProductPageClient from './ProductPageClient'

export const revalidate = 60

const normalizePreviewValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = (await searchParams) || {}

  const slug = String(resolvedParams?.slug || '').trim()
  if (!slug) notFound()

  const preview = normalizePreviewValue(resolvedSearchParams?.preview)
  const supabase = await createServerSupabaseClient()
  const result = await loadPublicProductItem(supabase, slug, {
    previewRequested: Boolean(preview),
  })
  const initialItem = result.item

  if (!initialItem) {
    notFound()
  }

  return <ProductPageClient slug={slug} initialItem={initialItem} />
}
