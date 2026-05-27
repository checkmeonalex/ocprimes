import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { isSuperAdminEmail } from '@/lib/auth/superAdmin'

const normalizeRole = (value) => {
  const role = String(value || '').toLowerCase().trim()
  if (role === 'admin' || role === 'vendor' || role === 'customer') return role
  return ''
}

const pushRole = (roles, roleValue) => {
  const normalized = normalizeRole(roleValue)
  if (normalized) roles.add(normalized)
}

async function collectRolesFromClient(client, userId) {
  const roles = new Set()

  const { data: roleRows, error: roleError } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (roleError) {
    return { roles, error: roleError }
  }

  if (Array.isArray(roleRows)) {
    roleRows.forEach((row) => pushRole(roles, row?.role))
  } else {
    pushRole(roles, roleRows?.role)
  }

  const { data: profileRow } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  pushRole(roles, profileRow?.role)

  return { roles, error: null }
}

function resolveRoleInfo(roleSet, userEmail) {
  if (isSuperAdminEmail(userEmail)) {
    roleSet.add('admin')
  }
  const isAdmin = roleSet.has('admin')
  const isVendor = roleSet.has('vendor')
  if (isAdmin || isVendor) {
    roleSet.add('customer')
  }
  const role = isAdmin ? 'admin' : isVendor ? 'vendor' : 'customer'
  return {
    role,
    isAdmin,
    isVendor,
    roles: Array.from(roleSet),
  }
}

export async function getUserRoleInfo(supabase, userId, userEmail = '') {
  const { roles, error } = await collectRolesFromClient(supabase, userId)

  if (error) {
    console.error('Role lookup failed:', { userId, message: error.message })
    return resolveRoleInfo(new Set(), userEmail)
  }

  return resolveRoleInfo(roles, userEmail)
}

export async function getUserRole(supabase, userId, userEmail = '') {
  const info = await getUserRoleInfo(supabase, userId, userEmail)
  return info.role
}

export async function getUserRoleInfoSafe(supabase, userId, userEmail = '') {
  const info = await getUserRoleInfo(supabase, userId, userEmail)
  if (info.isAdmin || info.isVendor) return info

  try {
    const adminDb = createAdminSupabaseClient()
    const { roles, error } = await collectRolesFromClient(adminDb, userId)

    if (error) {
      return info
    }

    return resolveRoleInfo(roles, userEmail)
  } catch {
    return info
  }
}

export async function getUserRoleSafe(supabase, userId, userEmail = '') {
  const info = await getUserRoleInfoSafe(supabase, userId, userEmail)
  return info.role
}
