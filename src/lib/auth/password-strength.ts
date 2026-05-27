const MIN_PASSWORD_LENGTH = 8

const hasLetter = (value: string) => /[A-Za-z]/.test(value)
const hasNumber = (value: string) => /\d/.test(value)
const hasLowercase = (value: string) => /[a-z]/.test(value)
const hasUppercase = (value: string) => /[A-Z]/.test(value)
const hasSymbol = (value: string) => /[^A-Za-z0-9]/.test(value)

export function getPasswordStrength(password: string) {
  const value = String(password || '')
  const lengthOk = value.length >= MIN_PASSWORD_LENGTH
  const letterOk = hasLetter(value)
  const numberOk = hasNumber(value)
  const mixedCase = hasLowercase(value) && hasUppercase(value)
  const symbolOk = hasSymbol(value)

  const meetsMinimum = lengthOk && letterOk && numberOk

  if (!meetsMinimum) {
    return {
      label: 'Weak',
      tone: 'weak',
      level: 1,
      canSubmit: false,
      message: 'Add at least 8 characters, including letters and numbers.',
    } as const
  }

  if (value.length >= 10 && (mixedCase || symbolOk)) {
    return {
      label: 'Strong',
      tone: 'strong',
      level: 3,
      canSubmit: true,
      message: 'Strong password.',
    } as const
  }

  return {
    label: 'Medium',
    tone: 'medium',
    level: 2,
    canSubmit: true,
    message: 'Good password. Add uppercase letters or symbols to make it stronger.',
  } as const
}

export function isWeakPassword(password: string) {
  return !getPasswordStrength(password).canSubmit
}

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Add at least 8 characters, including letters and numbers.'
