import { renderVendorPage } from '../vendors/[slug]/VendorPageContent'

export const dynamic = 'force-dynamic'

export default async function RootVendorPage({ params }) {
  const resolvedParams = await params
  return renderVendorPage(resolvedParams?.vendorSlug)
}
