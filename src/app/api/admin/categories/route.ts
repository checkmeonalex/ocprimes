import type { NextRequest } from 'next/server'
import { createCategory, listCategories } from '@/lib/admin/category-route'

export async function GET(request: NextRequest) {
  return listCategories(request)
}

export async function POST(request: NextRequest) {
  return createCategory(request)
}
