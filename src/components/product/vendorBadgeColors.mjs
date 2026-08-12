// Pastel tint + matching dark text per hue, drawn from the same 8-hue
// colorblind-safe categorical family (see dataviz skill reference palette)
// so each vendor gets a stable, always-distinguishable light badge color
// derived from its name/id.
const VENDOR_BADGE_COLORS = [
  { bg: '#dcebfa', text: '#184f95' }, // blue
  { bg: '#fbe1d3', text: '#a3431a' }, // orange
  { bg: '#d3f0e5', text: '#0f6b4c' }, // aqua
  { bg: '#faecc7', text: '#8a6300' }, // yellow
  { bg: '#fbe1ec', text: '#a13c64' }, // magenta
  { bg: '#d6ead6', text: '#0a5c0a' }, // green
  { bg: '#e2ddf5', text: '#372a80' }, // violet
  { bg: '#fadbdb', text: '#a3302f' }, // red
]

const hashString = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export const getVendorBadgeColors = (vendorKey) => {
  const key = String(vendorKey || '').trim().toLowerCase()
  if (!key) return VENDOR_BADGE_COLORS[0]
  const index = hashString(key) % VENDOR_BADGE_COLORS.length
  return VENDOR_BADGE_COLORS[index]
}
