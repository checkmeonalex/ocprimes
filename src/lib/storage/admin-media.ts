import { ALLOWED_IMAGE_TYPES } from './r2'

export const ALLOWED_ADMIN_IMAGE_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  'image/gif',
])
