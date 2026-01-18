export async function getUserRole(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Role lookup failed:', { userId, message: error.message })
    return 'customer'
  }

  if (!data?.role) {
    console.error('Role lookup empty:', { userId })
  }
  return data?.role === 'admin' ? 'admin' : 'customer'
}
