import { useCallback, useEffect, useState } from 'react'
import { fetchCustomerById } from './customerApi.mjs'

export function useCustomerDetail(customerId) {
  const [customer, setCustomer] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadCustomer = useCallback(async () => {
    if (!customerId) return
    setIsLoading(true)
    setError('')
    try {
      const payload = await fetchCustomerById(customerId)
      setCustomer(payload || null)
    } catch (err) {
      setError(err?.message || 'Unable to load customer.')
      setCustomer(null)
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  return { customer, isLoading, error, reload: loadCustomer }
}
