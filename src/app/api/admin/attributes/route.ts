import type { NextRequest } from 'next/server'
import { createAttribute, deleteAttribute, listAttributes, updateAttribute } from '@/lib/admin/attribute-route'

export async function GET(request: NextRequest) {
  return listAttributes(request)
}

export async function POST(request: NextRequest) {
  return createAttribute(request)
}

export async function PATCH(request: NextRequest) {
  return updateAttribute(request)
}

export async function DELETE(request: NextRequest) {
  return deleteAttribute(request)
}
