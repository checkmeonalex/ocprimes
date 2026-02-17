import ProductCatalogPage from '@/components/product/catalog/ProductCatalogPage'
import { fetchProductListingPayload } from '@/lib/catalog/product-listing'
import { fetchBrandBySlugOrId } from '@/lib/catalog/brands'
import { buildVendorCategoryImageList } from '@/lib/catalog/categories'
import { countBrandFollowers } from '@/lib/catalog/brand-following'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRoleSafe } from '@/lib/auth/roles'
import { DEFAULT_VENDOR_VERIFIED_BADGE_PATH } from '@/lib/catalog/vendor-verification'

const toReadableName = (value = '') =>
  String(value || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

export default async function VendorPage({ params }) {
  const resolvedParams = await params
  const vendorSlug = String(resolvedParams?.slug || '').trim()
  const listing = await fetchProductListingPayload({ vendor: vendorSlug, page: 1, perPage: 10 })
  const items = listing.items
  const vendorMeta = vendorSlug ? await fetchBrandBySlugOrId(vendorSlug) : null
  const vendorCategories = await buildVendorCategoryImageList(items)
  const brandId = String(vendorMeta?.id || '').trim()

  const vendorName = String(vendorMeta?.name || toReadableName(vendorSlug) || 'Vendor')
  const productCount = Math.max(0, Number(listing.totalCount) || items.length || 0)
  const fallbackFollowers = Math.max(120, productCount * 37 + vendorName.length * 11)
  const realFollowersCount = brandId ? await countBrandFollowers(brandId) : fallbackFollowers
  const realSoldCount = Math.max(productCount * 15, Math.round(realFollowersCount * 0.42))
  const useCustomMetrics = Boolean(vendorMeta?.use_custom_profile_metrics)
  const customFollowers = Math.max(0, Number(vendorMeta?.custom_profile_followers) || 0)
  const customSold = Math.max(0, Number(vendorMeta?.custom_profile_sold) || 0)
  const followersCount = useCustomMetrics ? customFollowers : realFollowersCount
  const soldCount = useCustomMetrics ? customSold : realSoldCount
  const vendorHandle = `@${String(vendorMeta?.slug || vendorSlug || vendorName).replace(/\s+/g, '').toLowerCase()}`
  const vendorPublicSlug = String(vendorMeta?.slug || vendorSlug || '').trim()
  const brandOwnerUserId = String(vendorMeta?.created_by || '').trim()

  let canFollow = false
  let isFollowing = false
  let canEditStorefront = false

  if (brandId) {
    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user || null
    if (user?.id) {
      const role = await getUserRoleSafe(supabase, user.id)
      const canManageStorefrontRole = role === 'vendor' || role === 'admin'
      canEditStorefront = Boolean(brandOwnerUserId && brandOwnerUserId === user.id && canManageStorefrontRole)
      if (!canEditStorefront) {
        canFollow = role === 'customer'
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
        logoUrl: String(vendorMeta?.logo_url || '').trim(),
        slug: vendorPublicSlug,
        brandId,
        canFollow,
        isFollowing,
        canEditStorefront,
        isTrusted: Boolean(vendorMeta?.is_trusted_vendor),
        trustedBadgeUrl:
          String(vendorMeta?.trusted_badge_url || '').trim() || DEFAULT_VENDOR_VERIFIED_BADGE_PATH,
      }}
      vendorSlider={{
        urls: Array.isArray(vendorMeta?.banner_slider_urls) ? vendorMeta.banner_slider_urls : [],
        mobileUrls: Array.isArray(vendorMeta?.banner_slider_mobile_urls)
          ? vendorMeta.banner_slider_mobile_urls
          : [],
        links: Array.isArray(vendorMeta?.banner_slider_links) ? vendorMeta.banner_slider_links : [],
      }}
      storefrontFilter={{
        mode: vendorMeta?.storefront_filter_mode === 'tag' ? 'tag' : 'category',
        title: String(vendorMeta?.storefront_filter_title || '').trim(),
        productLimit: Math.max(1, Math.min(48, Number(vendorMeta?.storefront_filter_product_limit) || 8)),
        items: Array.isArray(vendorMeta?.storefront_filter_items)
          ? vendorMeta.storefront_filter_items
          : [],
      }}
      storeProductCount={productCount}
      childCategories={vendorCategories}
      listingQuery={{ vendor: vendorSlug }}
    />
  )
}
