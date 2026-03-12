import { notFound } from 'next/navigation'
import TrustPageLayout from '@/components/trust-pages/TrustPageLayout'
import { getTrustPage, getTrustPageParams } from '@/components/trust-pages/trustPageRegistry.mjs'

export function generateStaticParams() {
  return getTrustPageParams('about')
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const page = getTrustPage('about', slug)

  if (!page) {
    return { title: 'About Alxora | OCPRIMES' }
  }

  return {
    title: `${page.title} | OCPRIMES`,
    description: page.description,
  }
}

export default async function AboutTrustPage({ params }) {
  const { slug } = await params
  const page = getTrustPage('about', slug)

  if (!page) {
    notFound()
  }

  return <TrustPageLayout page={page} />
}
