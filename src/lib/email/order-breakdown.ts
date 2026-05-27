export type EmailOrderBreakdownItem = {
  name: string
  quantity: number
  image?: string | null
  lineTotal: number
}

export type EmailOrderBreakdown = {
  currency: string
  items: EmailOrderBreakdownItem[]
  shippingFee: number
  discountAmount: number
  totalAmount: number
  paymentMethodLabel?: string
}

export const formatEmailMoney = (value: number, currency: string) => {
  const amount = Number(value || 0)
  const safeCurrency = String(currency || 'NGN').trim().toUpperCase() || 'NGN'
  const fractionDigits = safeCurrency === 'NGN' ? 0 : 2

  if (!Number.isFinite(amount)) return safeCurrency === 'NGN' ? '₦0' : '$0.00'

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount)
  } catch {
    const symbol = safeCurrency === 'NGN' ? '₦' : '$'
    return `${symbol}${fractionDigits === 0 ? Math.round(amount) : amount.toFixed(2)}`
  }
}
