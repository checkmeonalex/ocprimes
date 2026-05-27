export const buildInitials = (name) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export const getCustomerDetailTabs = (customerId) => [
  { label: 'Profile', path: `/backend/admin/customers/${customerId || ''}` },
  { label: 'Addresses', path: `/backend/admin/customers/${customerId || ''}/addresses` },
  { label: 'About the user', path: `/backend/admin/customers/${customerId || ''}/about` },
  { label: 'Security', path: `/backend/admin/customers/${customerId || ''}/security` },
]
