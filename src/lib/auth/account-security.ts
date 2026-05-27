export const SECURITY_QUESTIONS = [
  'What is your mother’s maiden name?',
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is your favorite book?',
  'What was your first school?',
]

export const EMAIL_TWO_STEP_METHOD = 'email'
export const SMS_TWO_STEP_METHOD = 'sms'

export const getEffectiveTwoStepMethod = () => EMAIL_TWO_STEP_METHOD

export const getTwoStepMethodLabel = (method: string) =>
  method === SMS_TWO_STEP_METHOD ? 'SMS code' : 'Email code'
