import HomeLayoutSections from '../components/layouts/home/HomeLayoutSections'
import SelectedForYouSectionClient from '../components/layouts/home/SelectedForYouSectionClient'
import { BRAND_NAME, BRAND_SEARCH_DESCRIPTION, BRAND_TAGLINE } from '../lib/brand'
import { SITE_URL } from '../lib/seo'

export const metadata = {
  title: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
  description: BRAND_SEARCH_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: SITE_URL,
    title: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
    description: BRAND_SEARCH_DESCRIPTION,
    siteName: BRAND_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
    description: BRAND_SEARCH_DESCRIPTION,
  },
}

export default function HomePage() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: SITE_URL,
    description: BRAND_SEARCH_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <div className='min-h-screen flex'>
      <div className='flex-1 min-w-0'>
        <main className='min-h-screen bg-white overflow-x-hidden w-full'>
          <script
            type='application/ld+json'
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
          <script
            type='application/ld+json'
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
          <div className='main-container pt-0 pb-2 mb-4 md:mb-2'>
            <HomeLayoutSections />
            <SelectedForYouSectionClient />
          </div>
        </main>
      </div>
    </div>
  )
}
