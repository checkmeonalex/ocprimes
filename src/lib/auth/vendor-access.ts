import { buildSlug } from '@/lib/admin/taxonomy'

export const resolveUniqueBrandSlug = async (
  adminClient: any,
  preferred: string,
) => {
  const base = buildSlug(preferred) || `brand-${Date.now().toString().slice(-6)}`
  let candidate = base
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await adminClient
      .from('admin_brands')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (error) throw new Error('Unable to validate brand slug.')
    if (!data?.id) return candidate
    candidate = `${base}-${Math.floor(Math.random() * 900 + 100)}`
  }
  return `${base}-${Date.now().toString().slice(-4)}`
}

export async function provisionVendorAccess(
  adminClient: any,
  userId: string,
  brandName: string,
  brandSlug: string,
) {
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ id: userId, role: 'vendor' }, { onConflict: 'id' })
  if (profileError) {
    throw new Error('Unable to assign vendor profile.')
  }

  const { error: roleError } = await adminClient
    .from('user_roles')
    .upsert({ user_id: userId, role: 'vendor' }, { onConflict: 'user_id' })
  if (roleError) {
    throw new Error('Unable to assign vendor role.')
  }

  const { data: existingByOwner, error: ownerLookupError } = await adminClient
    .from('admin_brands')
    .select('id')
    .eq('created_by', userId)
    .maybeSingle()

  if (ownerLookupError) {
    throw new Error('Unable to validate vendor brand ownership.')
  }

  if (existingByOwner?.id) {
    return
  }

  let finalSlug = brandSlug
  const { data: existingBySlug, error: slugLookupError } = await adminClient
    .from('admin_brands')
    .select('id')
    .eq('slug', brandSlug)
    .maybeSingle()
  if (slugLookupError) {
    throw new Error('Unable to validate vendor brand slug.')
  }
  if (existingBySlug?.id) {
    finalSlug = await resolveUniqueBrandSlug(adminClient, brandName)
  }

  const { error: brandInsertError } = await adminClient.from('admin_brands').insert({
    name: brandName.trim(),
    slug: finalSlug,
    description: null,
    created_by: userId,
  })
  if (brandInsertError) {
    throw new Error(brandInsertError.message || 'Unable to create vendor brand.')
  }
}
