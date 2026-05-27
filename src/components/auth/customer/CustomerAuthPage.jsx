import CustomerAuthFlow from './CustomerAuthFlow'
import CustomerAuthShell from './CustomerAuthShell'

export default function CustomerAuthPage() {
  return (
    <CustomerAuthShell>
      <CustomerAuthFlow />
    </CustomerAuthShell>
  )
}
