import { redirect } from 'next/navigation'

export default function LegacyBrowsingHistoryRedirectPage() {
  redirect('/UserBackend/browsing-history')
}
