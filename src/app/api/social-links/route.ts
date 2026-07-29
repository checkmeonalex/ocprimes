import { NextResponse } from 'next/server'
import { getSiteSocialLinks } from '@/lib/site/social-links'

// Public read of the site-wide footer social links. Read straight through
// rather than via unstable_cache so an admin edit shows up immediately;
// a short shared-cache window keeps this cheap without hiding changes for
// long.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { item } = await getSiteSocialLinks()
  return NextResponse.json(
    { item },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' } },
  )
}
