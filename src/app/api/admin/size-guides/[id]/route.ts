import type { NextRequest } from 'next/server'
import { deleteSizeGuide } from '@/lib/admin/size-guide-route'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return deleteSizeGuide(request, params?.id)
}
