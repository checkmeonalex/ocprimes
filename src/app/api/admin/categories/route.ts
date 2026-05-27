import type { NextRequest } from 'next/server'
import { createCategory, listCategories, updateCategory } from '@/lib/admin/category-route'

export async function GET(request: NextRequest) {
  return listCategories(request)
}

export async function POST(request: NextRequest) {
  return createCategory(request)
}

export async function PATCH(request: NextRequest) {
  return updateCategory(request)
}
