export async function fetchCustomers({ page = 1, perPage = 10, q = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (String(q || '').trim()) params.set('q', String(q).trim())

  const response = await fetch(`/api/admin/customers?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load customers.')
  }
  return payload
}

export async function fetchCustomerById(customerId) {
  const response = await fetch(`/api/admin/customers/${customerId}`, {
    method: 'GET',
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load customer.')
  }
  return payload
}

export async function updateCustomerById(customerId, input) {
  const response = await fetch(`/api/admin/customers/${customerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input || {}),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to update customer.')
  }
  return payload
}

export async function setCustomerPassword(customerId, password) {
  const response = await fetch(`/api/admin/customers/${customerId}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to update password.')
  }
  return payload
}

export async function sendCustomerPasswordReset(customerId) {
  const response = await fetch(`/api/admin/customers/${customerId}/password-reset`, {
    method: 'POST',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to send reset link.')
  }
  return payload
}

export async function deleteCustomerById(customerId, confirmation) {
  const response = await fetch(`/api/admin/customers/${customerId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to delete customer.')
  }
  return payload
}

export async function fetchCustomerStats() {
  const response = await fetch('/api/admin/customers/stats', {
    method: 'GET',
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load customer stats.')
  }
  return payload
}
