import TrustPageLayout from '@/components/trust-pages/TrustPageLayout'
import { getTrustPage } from '@/components/trust-pages/trustPageRegistry.mjs'

export const metadata = {
  title: 'Privacy Policy | OCPRIMES',
}

export default function PrivacyPolicyPage() {
  const page = getTrustPage('legal', 'privacy-policy')

  return <TrustPageLayout page={page} />
}
