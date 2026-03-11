export async function sendEmailOtpCode(
  supabase: any,
  email: string,
  options: {
    redirectTo?: string
  } = {},
) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error('Email address is required.')
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: options.redirectTo,
    },
  })

  if (error) {
    throw new Error(error.message || 'Unable to send verification code.')
  }
}
