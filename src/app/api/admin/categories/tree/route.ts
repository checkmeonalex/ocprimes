import type { NextRequest } from 'next/server'
import { listCategoryTree } from '@/lib/admin/category-route'

export async function GET(request: NextRequest) {
  return listCategoryTree(request)
}
