export const buildCategoryTree = (items = []) => {
  const nodes = new Map()
  const roots = []

  items.forEach((item) => {
    nodes.set(item.id, { ...item, children: [] })
  })

  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id).children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortChildren = (list) => {
    list.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name)
    })
    list.forEach((child) => sortChildren(child.children))
  }

  sortChildren(roots)
  return roots
}

export const filterCategoryRowsWithVisibleAncestors = (items = []) => {
  const nodes = new Map(
    items.map((item) => [String(item?.id || '').trim(), item]),
  )
  const visibleCache = new Map()

  const hasVisibleChain = (item) => {
    const id = String(item?.id || '').trim()
    if (!id) return false
    if (visibleCache.has(id)) return visibleCache.get(id)

    const parentId = String(item?.parent_id || '').trim()
    if (!parentId) {
      visibleCache.set(id, true)
      return true
    }

    const parent = nodes.get(parentId)
    if (!parent) {
      visibleCache.set(id, false)
      return false
    }

    const visible = hasVisibleChain(parent)
    visibleCache.set(id, visible)
    return visible
  }

  return items.filter((item) => hasVisibleChain(item))
}

export const mapCategoryTreeToMenu = (roots = []) =>
  roots.map((root) => ({
    id: root.id,
    name: root.name,
    slug: root.slug,
    hasArrow: root.children.length > 0,
    subcategories: [
      {
        id: `${root.id}-list`,
        name: root.name,
        hasArrow: false,
        items: root.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          image: child.image_url || '',
          hasProducts: Boolean(child.has_products),
        })),
      },
    ],
  }))
