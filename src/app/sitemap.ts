import type { MetadataRoute } from 'next'
import { getTrustPages } from '@/components/trust-pages/trustPageRegistry.mjs'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { PUBLIC_STATIC_ROUTES, SITE_URL } from '@/lib/seo'

const toAbsoluteUrl = (path: string) => `${SITE_URL}${path}`

const buildEntry = (path: string, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'], priority: number, lastModified: Date = new Date()) => ({
  url: toAbsoluteUrl(path),
  lastModified,
  changeFrequency,
  priority,
})

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = PUBLIC_STATIC_ROUTES.map((path, index) =>
    buildEntry(path || '/', index === 0 ? 'daily' : 'weekly', index === 0 ? 1 : 0.8, now),
  )

  const aboutEntries = getTrustPages('about').map((page) =>
    buildEntry(`/about/${page.slug}`, 'monthly', 0.7, now),
  )
  const legalEntries = getTrustPages('legal').map((page) =>
    buildEntry(`/legal/${page.slug}`, 'monthly', 0.6, now),
  )

  entries.push(...aboutEntries, ...legalEntries)

  try {
    const db = createAdminSupabaseClient()

    const [productsResult, brandsResult, categoriesResult] = await Promise.all([
      db.from('products').select('slug, updated_at').eq('status', 'publish').not('slug', 'is', null).limit(5000),
      db.from('admin_brands').select('slug, updated_at').not('slug', 'is', null).limit(5000),
      db.from('admin_categories').select('slug, updated_at').eq('is_active', true).not('slug', 'is', null).limit(5000),
    ])

    if (!productsResult.error && Array.isArray(productsResult.data)) {
      entries.push(
        ...productsResult.data
          .map((item) => String(item?.slug || '').trim())
          .filter(Boolean)
          .map((slug, index) =>
            buildEntry(
              `/product/${encodeURIComponent(slug)}`,
              'weekly',
              index < 100 ? 0.9 : 0.8,
              now,
            ),
          ),
      )
    }

    if (!brandsResult.error && Array.isArray(brandsResult.data)) {
      entries.push(
        ...brandsResult.data
          .map((item) => String(item?.slug || '').trim())
          .filter(Boolean)
          .map((slug) => buildEntry(`/vendors/${encodeURIComponent(slug)}`, 'weekly', 0.7, now)),
      )
    }

    if (!categoriesResult.error && Array.isArray(categoriesResult.data)) {
      entries.push(
        ...categoriesResult.data
          .map((item) => String(item?.slug || '').trim())
          .filter(Boolean)
          .map((slug) => buildEntry(`/products/${encodeURIComponent(slug)}`, 'weekly', 0.7, now)),
      )
    }
  } catch (error) {
    console.error('Sitemap generation fallback:', error)
  }

  const uniqueEntries = new Map<string, MetadataRoute.Sitemap[number]>()
  entries.forEach((entry) => {
    uniqueEntries.set(entry.url, entry)
  })

  return Array.from(uniqueEntries.values())
}

