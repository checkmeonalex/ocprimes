import AuthShell from '@/components/auth/AuthShell'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow='Account Recovery'
      title='Reset password'
      subtitle='Choose a new password to secure your account.'
    >
      <ResetPasswordForm />
    </AuthShell>
  )
}
