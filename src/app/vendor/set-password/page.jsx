import AuthShell from '@/components/auth/AuthShell'
import VendorSetPasswordForm from '@/components/auth/VendorSetPasswordForm'

export default function VendorSetPasswordPage() {
  return (
    <AuthShell
      eyebrow='Seller Access'
      title='Set your password'
      subtitle='Your vendor request was approved. Create a password to activate dashboard access.'
    >
      <VendorSetPasswordForm />
    </AuthShell>
  )
}

