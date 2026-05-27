import type { NextRequest } from 'next/server'
import { reorderCategories } from '@/lib/admin/category-route'

export async function PATCH(request: NextRequest) {
  return reorderCategories(request)
}
