import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { requireDashboardUser } from '@/lib/auth/require-dashboard-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { jsonError, jsonOk } from '@/lib/http/response'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const getR2Config = () => {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  const endpoint = process.env.R2_ENDPOINT

  if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error('R2 is not configured.')
  }

  return { accessKeyId, secretAccessKey, bucketName, endpoint }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, applyCookies, canManageCatalog, isAdmin, isVendor, user } =
    await requireDashboardUser(_request)

  if (!canManageCatalog || !user?.id) {
    return jsonError('Forbidden.', 403)
  }
  const db = isAdmin ? supabase : createAdminSupabaseClient()

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonError('Invalid media id.', 400)
  }

  let lookupQuery = db
    .from('product_images')
    .select('id, r2_key, created_by')
    .eq('id', parsed.data.id)
  if (isVendor) {
    lookupQuery = lookupQuery.eq('created_by', user.id)
  }
  const { data, error } = await lookupQuery.maybeSingle()

  if (error) {
    console.error('Media lookup failed:', error.message)
    const errorCode = (error as { code?: string })?.code
    if (errorCode === '42703') {
      return jsonError('Media ownership column missing. Run migration 042_vendor_access.sql.', 500)
    }
    return jsonError('Unable to delete media.', 500)
  }

  if (!data) {
    return jsonError('Media not found.', 404)
  }

  if (data.r2_key) {
    let r2Config
    try {
      r2Config = getR2Config()
    } catch (configError) {
      console.error('R2 config error:', configError)
      return jsonError('Storage configuration missing.', 500)
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    })

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: r2Config.bucketName,
          Key: data.r2_key,
        }),
      )
    } catch (deleteError) {
      console.error('R2 delete failed:', deleteError)
      return jsonError('Unable to delete storage object.', 500)
    }
  }

  const { error: deleteError } = await db
    .from('product_images')
    .delete()
    .eq('id', data.id)

  if (deleteError) {
    console.error('DB delete failed:', deleteError.message)
    return jsonError('Unable to delete media.', 500)
  }

  const response = jsonOk({ id: data.id })
  applyCookies(response)
  return response
}
