import FeaturedStrip from '@/components/layouts/FeaturedStrip'
import LogoGrid from '@/components/layouts/LogoGrid'
import VendorBannerGrid from '@/components/vendor/VendorBannerGrid'
import BrowseCategoriesClient from '@/components/layouts/BrowseCategoriesClient'
import HomeHeroSlider from '@/components/layouts/home/HomeHeroSlider'
import ProductCardList from '@/components/product/ProductCardList'
import { fetchProductListing } from '@/lib/catalog/product-listing'
import { getCachedHomePageSettings } from '@/lib/home/settings'

const FEATURED_STRIP_FETCH_SIZE = 30

const clampLimit = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(30, Math.max(1, Math.floor(n))) : 12
}

const mapBlockBrowseCards = (cards) => {
  const normalized = (Array.isArray(cards) ? cards : [])
    .filter((c) => c?.imageUrl && c?.name)
    .map((c) => ({
      id: c.imageKey || c.imageUrl,
      name: c.name,
      image: c.imageUrl,
      alt: c.imageAlt || c.name,
      link: c.link || '',
      segment: String(c.segment || 'all').toLowerCase(),
    }))
  const all = normalized.filter((c) => c.segment === 'all')
  const men = normalized.filter((c) => c.segment === 'men')
  const women = normalized.filter((c) => c.segment === 'women')
  return {
    ALL: all.length ? all : [...men, ...women],
    MEN: men,
    WOMEN: women,
  }
}

async function renderBlock(block) {
  const cfg = block?.config || {}

  switch (block.type) {
    case 'banner_grid':
      return <VendorBannerGrid bannerGrid={cfg} />

    case 'hero_slider': {
      const slides = Array.isArray(cfg.slides) ? cfg.slides : []
      const desktopUrls = []
      const desktopTypes = []
      const desktopPosters = []
      const mobileUrls = []
      const mobileTypes = []
      const mobilePosters = []
      const links = []
      slides.forEach((s) => {
        if (s.desktopUrl) {
          desktopUrls.push(s.desktopUrl)
          desktopTypes.push(s.desktopType === 'video' ? 'video' : 'image')
          desktopPosters.push(s.desktopPoster || '')
          mobileUrls.push(s.mobileUrl || '')
          mobileTypes.push(s.mobileType === 'video' ? 'video' : 'image')
          mobilePosters.push(s.mobilePoster || '')
          links.push(s.linkUrl || '')
        }
      })
      if (!desktopUrls.length) return null
      return (
        <section className='relative isolate w-[calc(100%+0.2rem)] -mx-[0.10rem] overflow-hidden sm:w-full sm:mx-0'>
          <HomeHeroSlider
            images={desktopUrls}
            imageTypes={desktopTypes}
            imagePosters={desktopPosters}
            mobileImages={mobileUrls}
            mobileImageTypes={mobileTypes}
            mobileImagePosters={mobilePosters}
            links={links}
            autoMs={5000}
          />
        </section>
      )
    }

    case 'featured_strip': {
      if (!cfg.imageUrl) return null
      const categoryId = cfg.filterType === 'category' ? cfg.categoryId || '' : ''
      const tagId = cfg.filterType === 'tag' ? cfg.tagId || '' : ''
      const products =
        categoryId || tagId
          ? await fetchProductListing({
              page: 1,
              perPage: FEATURED_STRIP_FETCH_SIZE,
              category: categoryId,
              tag: tagId,
            })
          : []
      return (
        <FeaturedStrip
          imageUrl={cfg.imageUrl}
          imageAlt={cfg.titleMain || 'Featured'}
          products={products}
          tagId={tagId || null}
          categoryId={categoryId || null}
          titleMain={cfg.titleMain}
        />
      )
    }

    case 'logo_grid': {
      const items = Array.isArray(cfg.items) ? cfg.items : []
      if (!items.length) return null
      return (
        <LogoGrid
          title={cfg.title || ''}
          titleBgColor={cfg.titleBgColor || '#111827'}
          titleTextColor={cfg.titleTextColor || '#ffffff'}
          items={items}
        />
      )
    }

    case 'product_catalog': {
      const { title, subtitle, filterMode, categoryId, tagId, limit } = cfg
      const perPage = clampLimit(limit)
      const shouldFetch =
        (filterMode === 'category' && categoryId) || (filterMode === 'tag' && tagId)
      const products = shouldFetch
        ? await fetchProductListing({
            page: 1,
            perPage,
            category: filterMode === 'category' ? categoryId : '',
            tag: filterMode === 'tag' ? tagId : '',
          })
        : []
      return (
        <ProductCardList
          products={products}
          useSeedFallback={false}
          title={title || 'Fashion Collection'}
          subtitle={subtitle || 'Discover our latest trends and bestsellers'}
        />
      )
    }

    case 'browse_cards': {
      const cards = Array.isArray(cfg.cards) ? cfg.cards : []
      if (!cards.length) return null
      const tabs = mapBlockBrowseCards(cards)
      const hasAny = Object.values(tabs).some((arr) => arr.length > 0)
      if (!hasAny) return null
      return <BrowseCategoriesClient title={cfg.title || ''} tabs={tabs} />
    }

    default:
      return null
  }
}

export default async function HomeLayoutSections() {
  const settings = await getCachedHomePageSettings()
  if (!settings?.id) return null

  const homeBlocks = Array.isArray(settings.home_blocks) ? settings.home_blocks : []
  if (!homeBlocks.length) return null

  const entries = await Promise.all(
    homeBlocks.map(async (block) => ({
      id: block.id,
      el: await renderBlock(block),
    })),
  )

  const rendered = entries.filter((e) => e.el !== null)
  if (!rendered.length) return null

  return (
    <div className='mt-4'>
      {rendered.map(({ id, el }) => (
        <div key={id}>{el}</div>
      ))}
    </div>
  )
}
