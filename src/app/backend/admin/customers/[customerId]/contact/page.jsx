import { redirect } from 'next/navigation'

export default async function RemovedCustomerContactPage({ params }) {
  const resolved = await params
  const customerId = Array.isArray(resolved?.customerId) ? resolved.customerId[0] : resolved?.customerId
  redirect(`/backend/admin/customers/${customerId || ''}`)
}
