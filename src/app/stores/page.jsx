import VendorBrowseSection from '../../components/layouts/home/VendorBrowseSection'
import { BRAND_NAME } from '../../lib/brand'
import { SITE_URL } from '../../lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: `All Stores | ${BRAND_NAME}`,
  description: `Browse every store on ${BRAND_NAME}.`,
  alternates: {
    canonical: '/stores',
  },
  openGraph: {
    url: `${SITE_URL}/stores`,
    title: `All Stores | ${BRAND_NAME}`,
    description: `Browse every store on ${BRAND_NAME}.`,
    siteName: BRAND_NAME,
    type: 'website',
  },
}

export default function StoresPage() {
  return (
    <div className='min-h-screen flex'>
      <div className='flex-1 min-w-0'>
        <main className='min-h-screen bg-white overflow-x-hidden w-full'>
          <div className='main-container pt-0 pb-2 mb-4 md:mb-2'>
            <VendorBrowseSection />
          </div>
        </main>
      </div>
    </div>
  )
}
