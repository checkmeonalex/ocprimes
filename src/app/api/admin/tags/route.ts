import type { NextRequest } from 'next/server'
import { createTaxonomy, listTaxonomy, updateTaxonomy } from '@/lib/admin/taxonomy-route'

const config = {
  table: 'admin_tags',
  singularLabel: 'tag',
  pluralLabel: 'tags',
}

export async function GET(request: NextRequest) {
  return listTaxonomy(request, config)
}

export async function POST(request: NextRequest) {
  return createTaxonomy(request, config)
}

export async function PATCH(request: NextRequest) {
  return updateTaxonomy(request, config)
}
