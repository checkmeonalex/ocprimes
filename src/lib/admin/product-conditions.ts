export const PRODUCT_CONDITION_VALUES = [
  'brand_new',
  'like_new',
  'open_box',
  'refurbished',
  'handmade',
  'okx',
] as const

export type ProductConditionValue = (typeof PRODUCT_CONDITION_VALUES)[number]

export const PRODUCT_CONDITION_OPTIONS: Array<{
  value: ProductConditionValue
  label: string
  description: string
}> = [
  {
    value: 'brand_new',
    label: 'Brand New',
    description: 'Unused, factory sealed, complete package.',
  },
  {
    value: 'like_new',
    label: 'Like New',
    description: 'Minimal signs of use, excellent appearance and function.',
  },
  {
    value: 'open_box',
    label: 'Open Box',
    description: 'Opened package, product verified and fully functional.',
  },
  {
    value: 'refurbished',
    label: 'Refurbished',
    description: 'Professionally restored, tested, and ready for use.',
  },
  {
    value: 'handmade',
    label: 'Handmade',
    description: 'Crafted by hand, unique finish and character.',
  },
  {
    value: 'okx',
    label: 'OKX',
    description: 'Custom condition marker (details to be defined).',
  },
]
