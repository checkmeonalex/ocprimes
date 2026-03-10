import FeaturedStrip from '@/components/layout/FeaturedStrip'
import HotspotProductSlider from '@/components/layout/HotspotProductSlider'
import LogoGrid from '@/components/layout/LogoGrid'
import { fetchHotspotLayoutsByCategory } from '@/lib/catalog/hotspot'
import { fetchLogoGridByCategory } from '@/lib/catalog/logo-grid'
import { fetchProductListing } from '@/lib/catalog/product-listing'
import { getCachedHomePageSettings } from '@/lib/home/settings'
import { normalizeHomeLayoutOrder } from '@/lib/home/schema'

const ALLOWED_KEYS = new Set(['featured_strip', 'hotspot', 'logo_grid'])
const FEATURED_STRIP_FETCH_SIZE = 30

const buildFeaturedStrip = ({ parent, products }) => {
  const hasConfig = parent?.featured_strip_image_url
  if (!hasConfig) return null

  return (
    <FeaturedStrip
      imageUrl={parent.featured_strip_image_url}
      imageAlt={parent?.banner_title || parent?.name || 'Featured'}
      products={products}
      tagId={parent.featured_strip_tag_id}
      categoryId={parent.featured_strip_category_id}
      titleMain={parent?.featured_strip_title_main}
    />
  )
}

const buildHotspotSection = ({ parent, hotspotLayouts }) => {
  if (!Array.isArray(hotspotLayouts) || hotspotLayouts.length === 0) return null
  return (
    <HotspotProductSlider
      layouts={hotspotLayouts}
      titleMain={parent?.hotspot_title_main}
    />
  )
}

const buildLogoGridSection = ({ logoGrid }) => {
  if (!logoGrid?.items || logoGrid.items.length === 0) return null
  return (
    <LogoGrid
      title={logoGrid.title}
      titleBgColor={logoGrid.title_bg_color}
      titleTextColor={logoGrid.title_text_color}
      items={logoGrid.items}
    />
  )
}

export default async function HomeLayoutSections() {
  const settings = await getCachedHomePageSettings()
  if (!settings?.id) return null

  const shouldFetchFeaturedStrip =
    settings?.featured_strip_image_url

  const [hotspotLayouts, logoGrid, products] = await Promise.all([
    fetchHotspotLayoutsByCategory(settings.legacy_category_id || ''),
    fetchLogoGridByCategory(settings.legacy_category_id || ''),
    shouldFetchFeaturedStrip
      ? fetchProductListing({
          page: 1,
          perPage: FEATURED_STRIP_FETCH_SIZE,
          category: settings?.featured_strip_category_id || '',
          tag: settings?.featured_strip_tag_id || '',
        })
      : Promise.resolve([]),
  ])

  const featuredStripSection = buildFeaturedStrip({ parent: settings, products })
  const hotspotSection = buildHotspotSection({ parent: settings, hotspotLayouts })
  const logoGridSection = buildLogoGridSection({ logoGrid })

  const orderedSections = normalizeHomeLayoutOrder(settings.layout_order)
    .filter((key) => ALLOWED_KEYS.has(key))
    .map((key) => ({
      key,
      element:
        key === 'featured_strip'
          ? featuredStripSection
          : key === 'hotspot'
            ? hotspotSection
            : key === 'logo_grid'
              ? logoGridSection
              : null,
    }))
    .filter((entry) => !!entry.element)

  if (!orderedSections.length) return null

  return (
    <div className='mt-4'>
      {orderedSections.map(({ key, element }) => (
        <div key={`home-layout-${key}`}>{element}</div>
      ))}
    </div>
  )
}
