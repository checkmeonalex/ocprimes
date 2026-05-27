export const parseCheckoutSelectionParam = (value: string | null | undefined) => {
  const raw = String(value || '').trim()
  if (!raw) return new Set<string>()
  return new Set(
    raw
      .split(',')
      .map((entry) => String(entry || '').trim())
      .filter(Boolean),
  )
}

export const buildCheckoutSelectionParam = (keys: Iterable<string>) => {
  const list = Array.from(keys)
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
  if (!list.length) return ''
  return list.join(',')
}

export const filterItemsByCheckoutSelection = <
  T extends { key?: string | null },
>(
  items: T[],
  selectedKeys: Set<string>,
) => {
  if (!Array.isArray(items) || items.length === 0) return []
  if (!(selectedKeys instanceof Set) || selectedKeys.size === 0) return items
  return items.filter((item) => selectedKeys.has(String(item?.key || '').trim()))
}
