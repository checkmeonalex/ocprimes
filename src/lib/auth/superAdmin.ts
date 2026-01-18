const defaultSuperAdminEmail = 'ocprimes@gmail.com'

export function getSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL || defaultSuperAdminEmail).toLowerCase()
}

export function isSuperAdminEmail(email) {
  if (!email || typeof email !== 'string') return false
  return email.toLowerCase() === getSuperAdminEmail()
}
