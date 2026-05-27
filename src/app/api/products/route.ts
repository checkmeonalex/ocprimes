import type { NextRequest } from 'next/server'
import { listPublicProducts } from '@/lib/catalog/product-route'

export async function GET(request: NextRequest) {
  return listPublicProducts(request)
}
