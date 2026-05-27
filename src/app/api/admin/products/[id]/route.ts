import type { NextRequest } from 'next/server'
import { deleteProduct, getProduct, updateProduct } from '@/lib/admin/product-route'

const readParams = async (context: { params: Promise<{ id: string }> }) => {
  const params = await context.params
  return params.id
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await readParams(context)
  return getProduct(request, id)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await readParams(context)
  return updateProduct(request, id)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await readParams(context)
  return deleteProduct(request, id)
}
