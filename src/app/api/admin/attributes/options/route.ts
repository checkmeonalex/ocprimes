import type { NextRequest } from 'next/server'
import {
  createAttributeOption,
  deleteAttributeOption,
  listAttributeOptions,
  updateAttributeOption,
} from '@/lib/admin/attribute-options-route'

export async function GET(request: NextRequest) {
  return listAttributeOptions(request)
}

export async function POST(request: NextRequest) {
  return createAttributeOption(request)
}

export async function PATCH(request: NextRequest) {
  return updateAttributeOption(request)
}

export async function DELETE(request: NextRequest) {
  return deleteAttributeOption(request)
}
