import { notFound } from 'next/navigation'
import ProductCatalogPage from '@/components/product/catalog/ProductCatalogPage'
import { fetchProductListingPayload } from '@/lib/catalog/product-listing'
import { fetchBrandBySlugOrId } from '@/lib/catalog/brands'
import { buildVendorCategoryImageList, buildVendorCategoryTree } from '@/lib/catalog/categories'
import { countBrandFollowers } from '@/lib/catalog/brand-following'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRoleSafe } from '@/lib/auth/roles'
import { DEFAULT_VENDOR_VERIFIED_BADGE_PATH } from '@/lib/catalog/vendor-verification'

const toReadableName = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

export async function renderVendorPage(vendorSlug, searchParams = {}) {
  const normalizedVendorSlug = String(vendorSlug || '').trim()
  if (!normalizedVendorSlug) {
    notFound()
  }

  const categoryFilter = String(searchParams?.category || '').trim()

  const listing = await fetchProductListingPayload({
    vendor: normalizedVendorSlug,
    category: categoryFilter || undefined,
    page: 1,
    perPage: 10,
    fields: 'card',
  })
  const items = listing.items
  const vendorMeta = await fetchBrandBySlugOrId(normalizedVendorSlug)

  if (!vendorMeta && (!Array.isArray(items) || items.length === 0)) {
    notFound()
  }

  const [vendorCategories, vendorCategoryTree] = await Promise.all([
    buildVendorCategoryImageList(items),
    buildVendorCategoryTree(items),
  ])
  const brandId = String(vendorMeta?.id || '').trim()

  const vendorName = String(vendorMeta?.name || toReadableName(normalizedVendorSlug) || 'Vendor')
  const productCount = Math.max(0, Number(listing.totalCount) || items.length || 0)
  const fallbackFollowers = Math.max(120, productCount * 37 + vendorName.length * 11)
  const realFollowersCount = brandId ? await countBrandFollowers(brandId) : fallbackFollowers
  const realSoldCount = Math.max(productCount * 15, Math.round(realFollowersCount * 0.42))
  const useCustomMetrics = Boolean(vendorMeta?.use_custom_profile_metrics)
  const customFollowers = Math.max(0, Number(vendorMeta?.custom_profile_followers) || 0)
  const customSold = Math.max(0, Number(vendorMeta?.custom_profile_sold) || 0)
  const followersCount = useCustomMetrics ? customFollowers : realFollowersCount
  const soldCount = useCustomMetrics ? customSold : realSoldCount

  const ratingValue = Boolean(vendorMeta?.use_custom_rating)
    ? Math.min(5, Math.max(0, Number(vendorMeta?.custom_profile_rating) || 0))
    : 0
  const reviewCount = Boolean(vendorMeta?.use_custom_rating)
    ? Math.max(0, Number(vendorMeta?.custom_profile_reviews) || 0)
    : 0
  const ordersCount = soldCount
  const followersGrowthPct = Boolean(vendorMeta?.use_custom_followers_growth)
    ? Number(vendorMeta?.followers_growth_pct) || 0
    : 0
  const createdAt = vendorMeta?.created_at ? new Date(vendorMeta.created_at) : null
  const daysOnPlatform = createdAt
    ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 0
  const yearsOnPlatform = Math.floor(daysOnPlatform / 365)
  const monthsOnPlatform = Math.floor(daysOnPlatform / 30)
  const vendorHandle = `@${String(vendorMeta?.slug || normalizedVendorSlug || vendorName).replace(/\s+/g, '').toLowerCase()}`
  const vendorPublicSlug = String(vendorMeta?.slug || normalizedVendorSlug || '').trim()
  const brandOwnerUserId = String(vendorMeta?.created_by || '').trim()

  let canFollow = true
  let isFollowing = false
  let canEditStorefront = false

  if (brandId) {
    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user || null
    if (user?.id) {
      const role = await getUserRoleSafe(supabase, user.id)
      const canManageStorefrontRole = role === 'vendor' || role === 'admin'
      
      // Calculate if they can edit (owner)
      canEditStorefront = Boolean(
        brandOwnerUserId && brandOwnerUserId === user.id && canManageStorefrontRole,
      )
      
      // Only hide follow if they are the owner
      if (canEditStorefront) {
        canFollow = false
      }

      if (canFollow) {
        const { data } = await supabase
          .from('customer_vendor_follows')
          .select('brand_id')
          .eq('customer_user_id', user.id)
          .eq('brand_id', brandId)
          .maybeSingle()
        isFollowing = Boolean(data?.brand_id)
      }
    }
  }

  return (
    <ProductCatalogPage
      products={items}
      title={vendorName}
      subtitle=''
      vendorProfile={{
        name: vendorName,
        handle: vendorHandle,
        posts: productCount,
        followers: followersCount,
        sold: soldCount,
        orders: ordersCount,
        rating: ratingValue,
        reviewCount,
        followersGrowthPct,
        yearsOnPlatform,
        monthsOnPlatform,
        logoUrl: String(vendorMeta?.logo_url || '').trim(),
        slug: vendorPublicSlug,
        brandId,
        canFollow,
        isFollowing,
        canEditStorefront,
        isTrusted: Boolean(vendorMeta?.is_trusted_vendor),
        trustedBadgeUrl:
          String(vendorMeta?.trusted_badge_url || '').trim() || DEFAULT_VENDOR_VERIFIED_BADGE_PATH,
        logoFont: String(vendorMeta?.logo_font || '').trim(),
        logoFullUrl: String(vendorMeta?.logo_full_url || '').trim(),
      }}
      vendorTemplate={String(vendorMeta?.template || 'default').trim() || 'default'}
      vendorSlider={{
        urls: Array.isArray(vendorMeta?.banner_slider_urls) ? vendorMeta.banner_slider_urls : [],
        mobileUrls: Array.isArray(vendorMeta?.banner_slider_mobile_urls)
          ? vendorMeta.banner_slider_mobile_urls
          : [],
        links: Array.isArray(vendorMeta?.banner_slider_links) ? vendorMeta.banner_slider_links : [],
      }}
      storeProductCount={productCount}
      childCategories={vendorCategories}
      categoryTree={vendorCategoryTree}
      collectionsMenuMode={vendorMeta?.collections_menu_mode === 'flat' ? 'flat' : 'grouped'}
      activeCategorySlug={categoryFilter || ''}
      bannerGrid={vendorMeta?.banner_grid ?? null}
      storefrontSectionOrder={Array.isArray(vendorMeta?.storefront_section_order) ? vendorMeta.storefront_section_order : ['banner_grid', 'storefront_filter']}
      storefrontBlocks={Array.isArray(vendorMeta?.storefront_blocks) ? vendorMeta.storefront_blocks : []}
      listingQuery={{ vendor: normalizedVendorSlug, ...(categoryFilter ? { category: categoryFilter } : {}) }}
      initialNextCursor={listing.nextCursor}
      initialHasMore={listing.hasMore}
    />
  )
}
