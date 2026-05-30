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
    description: 'Clean and familiar. Sidebar filters, banner grid, and classic product cards — great for any store.',
    features: ['Sidebar filters', 'Banner grid / slider', 'Collections menu', 'Classic product cards', 'Sort & filter chips'],
    headerStyle: 'light',
    isAvailable: true,
  },
  {
    id: TEMPLATE_IDS.PRESTIGE,
    name: 'Prestige',
    description: 'Sleek and high-end. Dark header, full-width hero, and a clean 4-column grid — perfect for luxury brands.',
    features: ['Dark header', 'Full-width hero', 'No sidebar', '4-column grid', 'Hover-reveal cards'],
    headerStyle: 'dark',
    isAvailable: true,
  },
  {
    id: TEMPLATE_IDS.BIAD,
    name: 'Biad',
    description: 'Bold and edgy. All-black design with a marquee header, category tabs, and image-forward product cards.',
    features: ['Black background', 'Scrolling marquee', 'Category tabs', '4-column grid', 'Dark product page'],
    headerStyle: 'dark',
    isAvailable: true,
  },
]

/**
 * Default storefront blocks for each template.
 * When a vendor switches to a template, these block types are seeded into their
 * storefront_blocks if they don't already have a block of that type.
 * Blocks are per-vendor — deleting or editing them only affects that store.
 *
 * @type {Record<string, Array<{type: string, config: Record<string, unknown>}>>}
 */
export const TEMPLATE_DEFAULT_BLOCKS = {
  [TEMPLATE_IDS.DEFAULT]: [],
  [TEMPLATE_IDS.PRESTIGE]: [
    {
      type: 'banner_grid',
      config: {
        layout: 'single',
        mode: 'static',
        slides: [{ imageUrl: '', linkUrl: '' }],
      },
    },
  ],
  [TEMPLATE_IDS.BIAD]: [
    {
      type: 'banner_grid',
      config: {
        layout: 'single',
        mode: 'static',
        slides: [{ imageUrl: '', linkUrl: '' }],
      },
    },
  ],
}

/**
 * Returns the default blocks for a given template ID.
 * Blocks are returned as new objects (safe to mutate with generated IDs).
 * @param {string} templateId
 * @returns {Array<{type: string, config: Record<string, unknown>}>}
 */
export function getTemplateDefaultBlocks(templateId) {
  const id = String(templateId || '').trim().toLowerCase()
  return TEMPLATE_DEFAULT_BLOCKS[id] ?? []
}
