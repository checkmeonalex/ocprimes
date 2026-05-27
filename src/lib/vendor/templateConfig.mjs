/**
 * Vendor storefront template definitions.
 *
 * Source of truth is now src/templates/index.js — each template folder
 * contains its own template.config.mjs with metadata.
 *
 * This file is kept for backwards compatibility and re-exports from the registry.
 * For new code, import directly from @/templates/index.js.
 */

// These IDs must match the keys in src/templates/index.js
export const TEMPLATE_IDS = {
  DEFAULT: 'default',
  PRESTIGE: 'prestige',
  BIAD: 'biad',
}

/** @type {string[]} All valid template IDs */
export const VALID_TEMPLATE_IDS = Object.values(TEMPLATE_IDS)

/**
 * Returns a guaranteed-valid template ID. Falls back to 'default' for anything unknown.
 * @param {unknown} raw
 * @returns {string}
 */
export function resolveTemplateId(raw) {
  const id = String(raw || '').trim().toLowerCase()
  return VALID_TEMPLATE_IDS.includes(id) ? id : TEMPLATE_IDS.DEFAULT
}

/**
 * Full metadata for each template, used in the dashboard Templates picker.
 * Kept in sync with src/templates/{id}/template.config.mjs manually —
 * or replace with getAllTemplates() from @/templates/index.js in server contexts.
 */
export const VENDOR_TEMPLATES = [
  {
    id: TEMPLATE_IDS.DEFAULT,
    name: 'Default',
    description:
      'The standard storefront. Sidebar filters, banner grid or slider, collections menu, and classic product cards.',
    features: ['Sidebar filters', 'Banner grid / slider', 'Collections menu', 'Classic product cards', 'Sort & filter chips'],
    headerStyle: 'light',
    isAvailable: true,
  },
  {
    id: TEMPLATE_IDS.PRESTIGE,
    name: 'Prestige',
    description:
      'A luxury, editorial layout. Dark minimal header, full-width hero banner, no sidebar — products front and centre in a clean 4-column grid with hover-reveal cards.',
    features: ['Dark header', 'Full-width hero', 'No sidebar', '4-column grid', 'Hover-reveal cards'],
    headerStyle: 'dark',
    isAvailable: true,
  },
  {
    id: TEMPLATE_IDS.BIAD,
    name: 'Biad',
    description:
      'Streetwear-inspired. All-black storefront with a scrolling marquee header, giant catalog heading, category tab bar, and image-forward product cards.',
    features: ['Black background', 'Scrolling marquee', 'Category tabs', '4-column grid', 'Dark product page'],
    headerStyle: 'dark',
    isAvailable: true,
  },
]
