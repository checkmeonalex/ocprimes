const NON_RETURNABLE_KEYS = new Set([
  'not_returnable',
  'no_returns',
  'non_returnable',
  'final_sale',
  'not-returnable',
  'no-return',
  'no return',
  'none',
  'off',
  'disabled',
])

export const normalizeReturnPolicyKey = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

export const isReturnPolicyDisabled = (value: unknown) => {
  const key = normalizeReturnPolicyKey(value)
  if (!key) return false
  return NON_RETURNABLE_KEYS.has(key)
}
