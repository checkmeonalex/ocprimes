export const CATEGORY_LAYOUT_KEYS = [
  'banner',
  'hotspot',
  'logo_grid',
  'featured_strip',
] as const

export type CategoryLayoutKey = (typeof CATEGORY_LAYOUT_KEYS)[number]

export const CATEGORY_LAYOUT_LABELS: Record<
  CategoryLayoutKey,
  { label: string; description: string }
> = {
  banner: {
    label: 'Banner slider',
    description: 'Hero slider with overlay text.',
  },
  hotspot: {
    label: 'Hotspot slider',
    description: 'Hotspot image slider with product dots.',
  },
  logo_grid: {
    label: 'Logo grid',
    description: 'Brand logos grid section.',
  },
  featured_strip: {
    label: 'Featured strip',
    description: 'Feature image with product strip.',
  },
}

export const normalizeCategoryLayoutOrder = (order?: unknown) => {
  const normalized: CategoryLayoutKey[] = []
  if (Array.isArray(order)) {
    order.forEach((value) => {
      if (CATEGORY_LAYOUT_KEYS.includes(value as CategoryLayoutKey)) {
        const key = value as CategoryLayoutKey
        if (!normalized.includes(key)) {
          normalized.push(key)
        }
      }
    })
  }
  CATEGORY_LAYOUT_KEYS.forEach((key) => {
    if (!normalized.includes(key)) {
      normalized.push(key)
    }
  })
  return normalized
}
