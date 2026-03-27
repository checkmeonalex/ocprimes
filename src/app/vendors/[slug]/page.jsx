import { renderVendorPage } from './VendorPageContent'

export const dynamic = 'force-dynamic'

export default async function VendorPage({ params }) {
  const resolvedParams = await params
  return renderVendorPage(resolvedParams?.slug)
}
