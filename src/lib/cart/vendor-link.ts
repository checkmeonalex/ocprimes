const normalize = (value: unknown) => String(value || '').trim()

const toSlug = (value: string) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const buildVendorHref = ({
  slug,
  name,
}: {
  slug?: unknown
  name?: unknown
}) => {
  const safeSlug = normalize(slug)
  if (safeSlug) {
    return `/vendors/${encodeURIComponent(toSlug(safeSlug))}`
  }

  const safeName = normalize(name)
  if (safeName) {
    return `/vendors/${encodeURIComponent(toSlug(safeName))}`
  }

  return '/vendors'
}
