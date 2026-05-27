import TrustPageLayout from '@/components/trust-pages/TrustPageLayout'
import { getTrustPage } from '@/components/trust-pages/trustPageRegistry.mjs'

export const metadata = {
  title: 'Order Protection Policy | Alxora',
}

export default function OrderProtectionPage() {
  const page = getTrustPage('legal', 'order-protection-policy')

  return <TrustPageLayout page={page} />
}
