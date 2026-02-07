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
        })),
      },
    ],
  }))
