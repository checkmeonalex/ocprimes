import { renderPasswordResetEmail } from '@/emails/templates/auth-password-reset'
import { renderSigninLinkEmail } from '@/emails/templates/auth-signin-link'
import { renderEmailChangeVerificationEmail } from '@/emails/templates/auth-email-change'
import { renderVendorVerificationEmail } from '@/emails/templates/auth-vendor-verification'
import {
  renderVendorApprovalEmail,
  renderVendorRejectionEmail,
} from '@/emails/templates/auth-vendor-access'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { safeText } from '@/lib/email/utils'

export const sendPasswordResetEmail = async ({
  to,
  customerName,
  resetUrl,
}: {
  to: string
  customerName?: string
  resetUrl: string
}) => {
  const email = renderPasswordResetEmail({
    customerName: safeText(customerName),
    resetUrl: safeText(resetUrl),
  })

  await sendTransactionalEmail({
    to: safeText(to),
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

export const sendSigninLinkEmail = async ({
  to,
  customerName,
  signinUrl,
}: {
  to: string
  customerName?: string
  signinUrl: string
}) => {
  const email = renderSigninLinkEmail({
    customerName: safeText(customerName),
    signinUrl: safeText(signinUrl),
  })

  await sendTransactionalEmail({
    to: safeText(to),
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

export const sendEmailChangeVerificationEmail = async ({
  to,
  customerName,
  currentEmail,
  newEmail,
  verificationUrl,
}: {
  to: string
  customerName?: string
  currentEmail: string
  newEmail: string
  verificationUrl: string
}) => {
  const email = renderEmailChangeVerificationEmail({
    customerName: safeText(customerName),
    currentEmail: safeText(currentEmail),
    newEmail: safeText(newEmail),
    verificationUrl: safeText(verificationUrl),
  })

  await sendTransactionalEmail({
    to: safeText(to),
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

export const sendVendorVerificationEmail = async ({
  to,
  verificationCode,
}: {
  to: string
  verificationCode: string
}) => {
  const email = renderVendorVerificationEmail({
    email: safeText(to),
    verificationCode: safeText(verificationCode),
  })

  await sendTransactionalEmail({
    to: safeText(to),
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

export const sendVendorApprovalEmail = async ({
  to,
  fullName,
  brandName,
  setupUrl,
}: {
  to: string
  fullName?: string
  brandName?: string
  setupUrl: string
}) => {
  const email = renderVendorApprovalEmail({
    fullName: safeText(fullName),
    brandName: safeText(brandName),
    setupUrl: safeText(setupUrl),
  })

  await sendTransactionalEmail({
    to: safeText(to),
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

export const sendVendorRejectionEmail = async ({
  to,
  fullName,
  brandName,
  reviewNote,
}: {
  to: string
  fullName?: string
  brandName?: string
  reviewNote?: string
}) => {
  const email = renderVendorRejectionEmail({
    fullName: safeText(fullName),
    brandName: safeText(brandName),
    reviewNote: safeText(reviewNote),
  })

  await sendTransactionalEmail({
    to: safeText(to),
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}
