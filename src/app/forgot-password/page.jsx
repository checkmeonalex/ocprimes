import AuthShell from '@/components/auth/AuthShell'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow='Account Recovery'
      title='Forgot password'
      subtitle='Enter your email and we will send you a password reset link.'
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
