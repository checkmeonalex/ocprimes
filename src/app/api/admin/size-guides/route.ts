import type { NextRequest } from 'next/server'
import { createSizeGuide, listSizeGuides, updateSizeGuide } from '@/lib/admin/size-guide-route'

export async function GET(request: NextRequest) {
  return listSizeGuides(request)
}

export async function POST(request: NextRequest) {
  return createSizeGuide(request)
}

export async function PATCH(request: NextRequest) {
  return updateSizeGuide(request)
}
