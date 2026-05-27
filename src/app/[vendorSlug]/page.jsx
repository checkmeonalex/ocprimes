import { renderVendorPage } from '../vendors/[slug]/VendorPageContent'

export const dynamic = 'force-dynamic'

export default async function RootVendorPage({ params, searchParams }) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  return renderVendorPage(resolvedParams?.vendorSlug, resolvedSearch)
}
