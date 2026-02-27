export const slugifyVendor = (value: string) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const buildVendorHref = (vendorName: string, vendorSlug?: string | null) => {
  const explicitSlug = String(vendorSlug || '').trim()
  const slug = explicitSlug || slugifyVendor(vendorName)
  if (!slug) return '/products'
  return `/vendors/${encodeURIComponent(slug)}`
}
