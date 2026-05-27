const LEGACY_DEFAULT_WISHLIST_NAME = 'All wishlist'
const DEFAULT_WISHLIST_LABEL = 'Saved Items'

export const isDefaultWishlistName = (name?: string | null) =>
  name === LEGACY_DEFAULT_WISHLIST_NAME || name === DEFAULT_WISHLIST_LABEL

export const getWishlistDisplayName = (name?: string | null) =>
  isDefaultWishlistName(name) ? DEFAULT_WISHLIST_LABEL : name || ''

