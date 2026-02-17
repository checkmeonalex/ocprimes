import { createServerSupabaseClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export const fetchCategoryWithChildren = async (slug: string) => {
  noStore()
  const supabase = await createServerSupabaseClient()

  const { data: parent } = await supabase
    .from('admin_categories')
    .select(
      'id, name, slug, description, image_url, image_alt, banner_image_url, banner_image_key, banner_image_secondary_url, banner_image_secondary_key, banner_slider_urls, banner_slider_keys, banner_slider_mobile_urls, banner_slider_mobile_keys, banner_slider_links, banner_title, banner_subtitle, banner_cta_text, banner_cta_link, featured_strip_image_url, featured_strip_image_key, featured_strip_tag_id, featured_strip_category_id, hotspot_title_main, featured_strip_title_main, browse_categories_title, home_catalog_title, home_catalog_description, home_catalog_filter_mode, home_catalog_category_id, home_catalog_tag_id, home_catalog_limit, layout_order, is_active',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!parent?.id) return { parent: null, children: [] }

  const { data: children } = await supabase
    .from('admin_categories')
    .select('id, name, slug, image_url, image_alt, is_active')
    .eq('parent_id', parent.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return { parent, children: children || [] }
}

type ProductCategoryRef = {
  id?: string
  name?: string
  slug?: string
}

type ProductWithCategories = {
  categories?: ProductCategoryRef[]
}

type CategoryGraphRow = {
  id: string
  name: string | null
  slug: string | null
  parent_id: string | null
  image_url: string | null
  image_alt: string | null
}

type VendorCategoryListItem = {
  id: string
  name: string
  slug: string
  image_url: string
  image_alt: string
}

const normalizeKey = (value: string) => value.trim().toLowerCase()

export const buildVendorCategoryImageList = async (
  products: ProductWithCategories[] = [],
) => {
  noStore()
  const primaryCategories = products
    .map((item) => (Array.isArray(item?.categories) ? item.categories[0] : null))
    .filter((entry): entry is ProductCategoryRef => Boolean(entry?.name))

  if (!primaryCategories.length) return []

  const ids = Array.from(
    new Set(primaryCategories.map((entry) => String(entry.id || '').trim()).filter(Boolean)),
  )

  const graph = new Map<string, CategoryGraphRow>()

  if (ids.length) {
    const supabase = await createServerSupabaseClient()
    const visited = new Set<string>()
    let frontier = ids

    while (frontier.length) {
      const batch = frontier.filter((id) => !visited.has(id))
      if (!batch.length) break
      batch.forEach((id) => visited.add(id))

      const { data, error } = await supabase
        .from('admin_categories')
        .select('id, name, slug, parent_id, image_url, image_alt')
        .in('id', batch)

      if (error) {
        console.error('vendor category graph lookup failed:', error.message)
        break
      }

      const rows = (data || []) as CategoryGraphRow[]
      rows.forEach((row) => {
        if (!row?.id) return
        graph.set(row.id, row)
      })

      frontier = rows.map((row) => String(row.parent_id || '').trim()).filter(Boolean)
    }
  }

  const resolveRootCategory = (entry: ProductCategoryRef) => {
    const startId = String(entry.id || '').trim()
    let cursor = startId ? graph.get(startId) : null
    let root = cursor || null
    const seen = new Set<string>()

    while (cursor?.parent_id && !seen.has(cursor.id)) {
      seen.add(cursor.id)
      const parent = graph.get(cursor.parent_id)
      if (!parent) break
      root = parent
      cursor = parent
    }

    return root
  }

  const resolveBestImage = (entry: ProductCategoryRef) => {
    const startId = String(entry.id || '').trim()
    let cursor = startId ? graph.get(startId) : null
    const seen = new Set<string>()

    if (cursor?.image_url) return cursor

    while (cursor?.parent_id && !seen.has(cursor.id)) {
      seen.add(cursor.id)
      const parent = graph.get(cursor.parent_id)
      if (!parent) break
      if (parent.image_url) return parent
      cursor = parent
    }

    return resolveRootCategory(entry)
  }

  const dedupe = new Set<string>()
  const output: VendorCategoryListItem[] = []

  primaryCategories.forEach((entry) => {
    const rootCategory = resolveRootCategory(entry)
    const categoryMeta = resolveBestImage(entry)
    const leafName = String(entry.name || categoryMeta?.name || rootCategory?.name || '').trim()
    if (leafName) {
      output.push({
        id: String(entry.id || categoryMeta?.id || rootCategory?.id || leafName),
        name: leafName,
        slug: String(entry.slug || categoryMeta?.slug || rootCategory?.slug || '').trim(),
        image_url: String(categoryMeta?.image_url || '').trim(),
        image_alt: String(categoryMeta?.image_alt || leafName).trim(),
      })
    }

    const rootName = String(rootCategory?.name || '').trim()
    if (!rootName || normalizeKey(rootName) === normalizeKey(leafName)) return
    output.push({
      id: String(rootCategory?.id || rootName),
      name: rootName,
      slug: String(rootCategory?.slug || '').trim(),
      image_url: String(rootCategory?.image_url || categoryMeta?.image_url || '').trim(),
      image_alt: String(rootCategory?.image_alt || rootName).trim(),
    })
  })

  const filtered = output
    .filter((entry) => {
      const key = normalizeKey(entry.name)
      if (!key || dedupe.has(key)) return false
      dedupe.add(key)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return filtered
}
