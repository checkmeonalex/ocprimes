import BrowseCategoriesClient from './BrowseCategoriesClient'
import { getCachedHomeBrowseCards } from '@/lib/home/browse-cards'

const interleaveBrowseCards = (primary = [], secondary = []) => {
  const mixed = []
  const maxLength = Math.max(primary.length, secondary.length)

  for (let index = 0; index < maxLength; index += 1) {
    if (primary[index]) mixed.push(primary[index])
    if (secondary[index]) mixed.push(secondary[index])
  }

  return mixed
}

const mapBrowseCardsToTabs = (items = []) => {
  const normalized = Array.isArray(items)
    ? items
        .filter((item) => item?.image_url && item?.name)
        .map((item) => ({
          id: item.id || `${item.segment}-${item.image_url}`,
          name: item.name,
          image: item.image_url,
          alt: item.image_alt || item.name,
          link: item.link || '',
          segment: String(item.segment || '').toLowerCase(),
        }))
    : []

  const all = normalized.filter((item) => item.segment === 'all')
  const men = normalized.filter((item) => item.segment === 'men')
  const women = normalized.filter((item) => item.segment === 'women')
  const resolvedAll = all.length ? all : interleaveBrowseCards(men, women)

  return {
    ALL: resolvedAll,
    MEN: men,
    WOMEN: women,
  }
}

const BrowseCategories = async () => {
  const payload = await getCachedHomeBrowseCards()
  const tabs = mapBrowseCardsToTabs(payload?.items || [])

  return (
    <BrowseCategoriesClient
      title={typeof payload?.title === 'string' ? payload.title.trim() : ''}
      tabs={tabs}
    />
  )
}

export default BrowseCategories
