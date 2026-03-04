import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ProductPageClient from './ProductPageClient'

export const revalidate = 60

const resolveBaseUrl = () => {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  const normalized = String(envUrl || '').trim().replace(/\/+$/, '')
  if (normalized) return normalized
  return 'http://localhost:3000'
}

const normalizePreviewValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

const fetchInitialProductItem = async (slug: string, preview: string) => {
  const params = new URLSearchParams()
  if (preview) params.set('preview', preview)
  const query = params.toString()

  const endpoint = `${resolveBaseUrl()}/api/products/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`

  const shouldBypassCache = Boolean(preview)

  const requestInit: RequestInit & { next?: { revalidate: number } } = shouldBypassCache
    ? { cache: 'no-store' }
    : { next: { revalidate } }

  if (shouldBypassCache) {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore
      .getAll()
      .map((entry) => `${entry.name}=${entry.value}`)
      .join('; ')

    if (cookieHeader) {
      requestInit.headers = {
        Cookie: cookieHeader,
      }
    }
  }

  const response = await fetch(endpoint, requestInit)
  if (!response.ok) return null

  const payload = await response.json().catch(() => null)
  return payload?.item || null
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
  const initialItem = await fetchInitialProductItem(slug, preview)

  if (!initialItem) {
    notFound()
  }

  return <ProductPageClient slug={slug} initialItem={initialItem} />
}
