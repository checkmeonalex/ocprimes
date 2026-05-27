import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildCanonicalProductSlug, loadPublicProductItem } from '@/lib/catalog/product-route'
import { DEFAULT_VENDOR_VERIFIED_BADGE_PATH } from '@/lib/catalog/vendor-verification'
import { BRAND_NAME } from '@/lib/brand'
import { SITE_URL } from '@/lib/seo'
import ProductContent from './ProductPageClient'

export const revalidate = 60

const stripHtml = (value: string) =>
  String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const buildProductDescription = (item: any) => {
  const shortDescription = stripHtml(String(item?.short_description || ''))
  const fullDescription = stripHtml(String(item?.description || ''))
  const fallback = `Shop ${String(item?.name || 'this product').trim()} on ${BRAND_NAME}.`
  return (shortDescription || fullDescription || fallback).slice(0, 160)
}

const getProductImages = (item: any) => {
  const directImages = Array.isArray(item?.images)
    ? item.images.map((entry: any) => String(entry?.url || '').trim()).filter(Boolean)
    : []
  const fallbackImage = String(item?.image_url || '').trim()
  return directImages.length ? directImages : fallbackImage ? [fallbackImage] : []
}

const getProductDisplayPrice = (item: any) => {
  const basePrice = Number(item?.price) || 0
  const discountPrice = Number(item?.discount_price) || 0
  if (discountPrice > 0 && discountPrice < basePrice) {
    return discountPrice
  }
  return basePrice
}

const buildCanonicalUrl = (slug: string) => `${SITE_URL}/product/${encodeURIComponent(slug)}`

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const resolvedParams = await params
  const slug = String(resolvedParams?.slug || '').trim()

  if (!slug) {
    return {
      title: `Product | ${BRAND_NAME}`,
    }
  }

  const supabase = await createServerSupabaseClient()
  const result = await loadPublicProductItem(supabase, slug)
  const item = result.item

  if (!item) {
    return {
      title: `Product | ${BRAND_NAME}`,
    }
  }

  const name = String(item?.name || 'Product').trim()
  const description = buildProductDescription(item)
  const images = getProductImages(item)
  const canonicalSlug = result.canonicalSlug || buildCanonicalProductSlug(item)
  const canonical = buildCanonicalUrl(canonicalSlug || slug)

  return {
    title: name,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title: `${name} | ${BRAND_NAME}`,
      description,
      images: images.length
        ? images.map((url) => ({
            url,
            alt: name,
          }))
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | ${BRAND_NAME}`,
      description,
      images: images.length ? images : undefined,
    },
  }
}

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

  const canonicalSlug = result.canonicalSlug || buildCanonicalProductSlug(initialItem)
  const canonical = buildCanonicalUrl(canonicalSlug || slug)
  const images = getProductImages(initialItem)
  const vendorBrand = Array.isArray(initialItem?.brands) ? (initialItem.brands[0] || null) : null
  const vendorTemplate = String(vendorBrand?.template || 'default').trim() || 'default'

  // Build vendor header profile — auth state (follow/edit) resolved client-side to avoid extra DB round-trips
  let vendorHeaderProfile: Record<string, any> | null = null
  if (vendorBrand?.slug) {
    const vp = initialItem?.vendor_profile || null
    vendorHeaderProfile = {
      name: String(vendorBrand.name || vp?.name || '').trim(),
      logoUrl: String(vp?.logo_url || '').trim(),
      slug: String(vendorBrand.slug || '').trim(),
      brandId: String(vendorBrand.id || '').trim(),
      brandCreatedBy: String(vendorBrand.created_by || '').trim(),
      handle: `@${String(vendorBrand.slug || '').toLowerCase()}`,
      followers: Math.max(0, Number(vp?.followers) || 0),
      sold: Math.max(0, Number(vp?.sold) || 0),
      posts: 0,
      canFollow: true,
      isFollowing: false,
      canEditStorefront: false,
      isTrusted: Boolean(vp?.is_trusted_vendor || vp?.isTrusted),
      trustedBadgeUrl:
        String(vp?.trusted_badge_url || vp?.trustedBadgeUrl || '').trim() ||
        DEFAULT_VENDOR_VERIFIED_BADGE_PATH,
    }
  }
  const productName = String(initialItem?.name || 'Product').trim()
  const description = buildProductDescription(initialItem)
  const vendorName = String(
    initialItem?.vendor_profile?.name ||
      initialItem?.brands?.[0]?.name ||
      '',
  ).trim()
  const categoryPath = Array.isArray(initialItem?.primary_category_path)
    ? initialItem.primary_category_path
    : []
  const displayPrice = getProductDisplayPrice(initialItem)
  const availability = Number(initialItem?.stock_quantity || 0) > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock'

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description,
    image: images,
    sku: String(initialItem?.sku || '').trim() || undefined,
    brand: vendorName
      ? {
          '@type': 'Brand',
          name: vendorName,
        }
      : undefined,
    offers: displayPrice > 0
      ? {
          '@type': 'Offer',
          priceCurrency: 'NGN',
          price: displayPrice.toFixed(2),
          availability,
          url: canonical,
          itemCondition: 'https://schema.org/NewCondition',
        }
      : undefined,
  }

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    },
    ...categoryPath.map((segment: any, index: number) => ({
      '@type': 'ListItem',
      position: index + 2,
      name: String(segment?.label || '').trim(),
      item: `${SITE_URL}${String(segment?.href || '').trim()}`,
    })),
    {
      '@type': 'ListItem',
      position: categoryPath.length + 2,
      name: productName,
      item: canonical,
    },
  ].filter((entry) => entry.name)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ProductContent slug={slug} initialItem={initialItem} vendorTemplate={vendorTemplate} vendorHeaderProfile={vendorHeaderProfile} />
    </>
  )
}
