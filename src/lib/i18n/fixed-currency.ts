export const formatUsdAmount = (value: unknown) => {
  const numeric = Number(value)
  const safeAmount = Number.isFinite(numeric) ? numeric : 0
  const fractionDigits = Number.isInteger(safeAmount) ? 0 : 2

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(safeAmount)
  } catch {
    return `$${safeAmount.toFixed(fractionDigits)}`
  }
}

const normalizeAmountLabel = (value: unknown) =>
  String(value || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()

export const formatUsdWithLocalAmount = (
  value: unknown,
  formatLocal: (amount: unknown, options?: { sourceCurrency?: string }) => string,
) => {
  const usdLabel = formatUsdAmount(value)
  const localLabel = formatLocal(value, { sourceCurrency: 'USD' })
  if (normalizeAmountLabel(localLabel) === normalizeAmountLabel(usdLabel)) {
    return usdLabel
  }
  return `${localLabel} (${usdLabel})`
}
