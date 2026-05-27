import { createServerSupabaseClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

const PRODUCT_CATEGORY_LINKS_TABLE = 'product_category_links'

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

  const childRows = Array.isArray(children) ? children : []
  const childIds = childRows
    .map((item) => String(item?.id || '').trim())
    .filter(Boolean)
  const categoriesWithProducts = new Set<string>()

  if (childIds.length) {
    const { data: productLinkRows, error: productLinksError } = await supabase
      .from(PRODUCT_CATEGORY_LINKS_TABLE)
      .select('category_id')
      .in('category_id', childIds)

    if (productLinksError) {
      console.error('category children product links lookup failed:', productLinksError.message)
    } else {
      ;(productLinkRows || []).forEach((row: { category_id?: string | null }) => {
        const categoryId = String(row?.category_id || '').trim()
        if (categoryId) categoriesWithProducts.add(categoryId)
      })
    }
  }

  return {
    parent,
    children: childRows.map((item) => ({
      ...item,
      has_products: categoriesWithProducts.has(String(item?.id || '').trim()),
    })),
  }
}

type ProductCategoryRef = {
  id?: string
  name?: string
  slug?: string
  parent_id?: string | null
}

type ProductWithCategories = {
  categories?: ProductCategoryRef[]
  primary_category_path?: Array<{ id?: string; label?: string; slug?: string }>
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
    .flatMap((item) => {
      const linkedCategories = Array.isArray(item?.categories) ? item.categories : []
      const childLinkedCategories = linkedCategories.filter((entry) =>
        Boolean(String(entry?.parent_id || '').trim()),
      )
      if (childLinkedCategories.length) {
        return childLinkedCategories
      }
      const path = Array.isArray(item?.primary_category_path) ? item.primary_category_path : []
      const deepestPathEntry = path.length ? path[path.length - 1] : null
      if (deepestPathEntry?.label) {
        return [
          {
            id: deepestPathEntry.id,
            name: deepestPathEntry.label,
            slug: deepestPathEntry.slug,
          },
        ]
      }
      return linkedCategories.length ? [linkedCategories[0]] : []
    })
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

export type VendorCategoryTreeNode = {
  id: string
  name: string
  slug: string
  children: { id: string; name: string; slug: string }[]
}

export const buildVendorCategoryTree = async (
  products: ProductWithCategories[] = [],
): Promise<VendorCategoryTreeNode[]> => {
  noStore()

  // Collect all leaf category refs from products
  const leafCategories = products
    .flatMap((item) => {
      const linked = Array.isArray(item?.categories) ? item.categories : []
      const children = linked.filter((e) => Boolean(String(e?.parent_id || '').trim()))
      if (children.length) return children
      const path = Array.isArray(item?.primary_category_path) ? item.primary_category_path : []
      const deepest = path.length ? path[path.length - 1] : null
      if (deepest?.label) return [{ id: deepest.id, name: deepest.label, slug: deepest.slug }]
      return linked.length ? [linked[0]] : []
    })
    .filter((e): e is ProductCategoryRef => Boolean(e?.name))

  if (!leafCategories.length) return []

  const ids = Array.from(
    new Set(leafCategories.map((e) => String(e.id || '').trim()).filter(Boolean)),
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
        console.error('vendor category tree lookup failed:', error.message)
        break
      }

      const rows = (data || []) as CategoryGraphRow[]
      rows.forEach((row) => { if (row?.id) graph.set(row.id, row) })
      frontier = rows.map((row) => String(row.parent_id || '').trim()).filter(Boolean)
    }
  }

  // For each leaf, walk up to find root and its direct child toward the leaf
  type TreeEntry = { rootId: string; rootName: string; rootSlug: string; childId?: string; childName?: string; childSlug?: string }
  const entries: TreeEntry[] = []

  for (const leaf of leafCategories) {
    const startId = String(leaf.id || '').trim()
    if (!startId) continue
    const startNode = graph.get(startId)
    if (!startNode) continue

    // Walk up to find root
    const chain: CategoryGraphRow[] = [startNode]
    const seen = new Set<string>([startNode.id])
    let cursor = startNode
    while (cursor.parent_id) {
      const parent = graph.get(cursor.parent_id)
      if (!parent || seen.has(parent.id)) break
      seen.add(parent.id)
      chain.unshift(parent)
      cursor = parent
    }

    const root = chain[0]
    // child toward leaf = immediate child of root (index 1), or undefined if leaf IS root
    const directChild = chain.length > 1 ? chain[1] : undefined

    entries.push({
      rootId: root.id,
      rootName: String(root.name || '').trim(),
      rootSlug: String(root.slug || '').trim(),
      childId: directChild?.id,
      childName: directChild ? String(directChild.name || '').trim() : undefined,
      childSlug: directChild ? String(directChild.slug || '').trim() : undefined,
    })
  }

  // Build tree map: rootId → { root info, children set }
  const treeMap = new Map<string, VendorCategoryTreeNode>()

  for (const entry of entries) {
    if (!entry.rootName) continue
    if (!treeMap.has(entry.rootId)) {
      treeMap.set(entry.rootId, { id: entry.rootId, name: entry.rootName, slug: entry.rootSlug, children: [] })
    }
    const node = treeMap.get(entry.rootId)!
    if (entry.childId && entry.childName) {
      const alreadyHasChild = node.children.some((c) => c.id === entry.childId)
      if (!alreadyHasChild) {
        node.children.push({ id: entry.childId, name: entry.childName, slug: entry.childSlug || '' })
      }
    }
  }

  const result = Array.from(treeMap.values())
    .map((node) => ({
      ...node,
      children: node.children.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return result
}
