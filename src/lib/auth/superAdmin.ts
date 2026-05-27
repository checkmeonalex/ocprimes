export function getSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase()
}

export function isSuperAdminEmail(email) {
  if (!email || typeof email !== 'string') return false
  return email.toLowerCase() === getSuperAdminEmail()
}
