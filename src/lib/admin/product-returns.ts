export const PRODUCT_RETURN_POLICY_VALUES = [
  'not_returnable',
  'support_return',
] as const

export type ProductReturnPolicyValue = (typeof PRODUCT_RETURN_POLICY_VALUES)[number]

export const PRODUCT_RETURN_POLICY_OPTIONS: Array<{
  value: ProductReturnPolicyValue
  label: string
  details: string
}> = [
  {
    value: 'not_returnable',
    label: 'Not Returnable',
    details: 'This product is final sale and cannot be returned after purchase.',
  },
  {
    value: 'support_return',
    label: 'Support Return',
    details:
      'This product supports returns under the store return window and policy conditions.',
  },
]
