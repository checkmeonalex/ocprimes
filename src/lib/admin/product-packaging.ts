export const PRODUCT_PACKAGING_VALUES = [
  'in_wrap_nylon',
  'in_a_box',
  'premium_gift_packaging',
  'cardboard_wrap',
] as const

export type ProductPackagingValue = (typeof PRODUCT_PACKAGING_VALUES)[number]

export const PRODUCT_PACKAGING_OPTIONS: Array<{
  value: ProductPackagingValue
  label: string
  details: string
}> = [
  {
    value: 'in_wrap_nylon',
    label: 'In Wrap Nylon',
    details: 'Packed securely in protective nylon wrap to reduce dust and moisture exposure.',
  },
  {
    value: 'in_a_box',
    label: 'In a Box',
    details: 'Packed in a standard shipping box for stable protection during delivery.',
  },
  {
    value: 'premium_gift_packaging',
    label: 'Premium / Gift Packaging',
    details: 'Packed in premium presentation packaging suitable for gifting.',
  },
  {
    value: 'cardboard_wrap',
    label: 'Cardboard Wrap',
    details: 'Wrapped with reinforced cardboard layers for practical transit protection.',
  },
]
