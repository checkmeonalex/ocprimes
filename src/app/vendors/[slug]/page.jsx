import { renderVendorPage } from './VendorPageContent'

export const dynamic = 'force-dynamic'

export default async function VendorPage({ params, searchParams }) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  return renderVendorPage(resolvedParams?.slug, resolvedSearch)
}
