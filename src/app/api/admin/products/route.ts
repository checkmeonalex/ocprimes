import type { NextRequest } from 'next/server'
import { createProduct, listProducts } from '@/lib/admin/product-route'

export async function GET(request: NextRequest) {
  return listProducts(request)
}

export async function POST(request: NextRequest) {
  return createProduct(request)
}
