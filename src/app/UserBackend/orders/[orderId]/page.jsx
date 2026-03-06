'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { useAlerts } from '@/context/AlertContext'
import {
  getCustomerOrderStatusLabel,
  getCustomerOrderStatusMessage,
  normalizeCustomerOrderStatusKey,
} from '@/lib/orders/customer-status'

const formatDate = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const formatDateTimeLabel = (value) => {
  const timestamp = new Date(value || '').getTime()
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizeTrackingStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const TRACKING_STEPS = [
  {
    key: 'accepted',
    label: 'Order accepted',
    currentText: 'Your order has been accepted and queued for fulfillment.',
    pendingText: 'Waiting for order acceptance.',
  },
  {
    key: 'picked_up',
    label: 'Order picked up',
    currentText: 'Seller is now handling your order.',
    pendingText: 'Waiting for seller to pick your items.',
  },
  {
    key: 'packed',
    label: 'Order packed',
    currentText: 'Your order has been packed and is being prepared for dispatch.',
    pendingText: 'Waiting for packaging.',
  },
  {
    key: 'out_for_delivery',
    label: 'Order enroute for delivery',
    currentText: 'Your order is out for delivery.',
    pendingText: 'Your order will be on its way to you soon.',
  },
  {
    key: 'delivered',
    label: 'Order delivered',
    currentText: 'Your order was delivered successfully.',
    pendingText: 'Delivery is still in progress.',
  },
]

const TERMINAL_STATUS_COPY = {
  failed: 'Payment failed. This order could not continue.',
  payment_failed: 'Payment failed. This order could not continue.',
  cancelled: 'This order was cancelled.',
  canceled: 'This order was cancelled.',
  refunded: 'This order has been refunded.',
}

const CURRENT_STEP_INDEX_BY_STATUS = {
  awaiting_payment: -1,
  pending: 0,
  paid: 0,
  processing: 2,
  ready_to_ship: 2,
  out_for_delivery: 3,
  delivered: 4,
  completed: 4,
}

const getCompletedStepIndexForTerminalStatus = (status) => {
  if (status === 'failed' || status === 'payment_failed') return -1
  if (status === 'cancelled' || status === 'canceled') return 0
  if (status === 'refunded') return 1
  return -1
}

const SUPPORT_HELP_OPTION = {
  key: 'need_assistance',
  label: 'Chat With Support for help.',
  detail: 'Speak with support if you need assistance with this order.',
}

const REPORT_REASON_OPTIONS_BY_STATUS = {
  awaiting_payment: [
    SUPPORT_HELP_OPTION,
    {
      key: 'cannot_complete_payment',
      label: 'I cannot complete payment.',
      detail: 'My payment method is not working or the transaction cannot be completed.',
    },
    {
      key: 'payment_page_error',
      label: 'Payment page returned an error.',
      detail: 'The payment page failed to load or displayed an unexpected error.',
    },
    {
      key: 'payment_failed_checkout',
      label: 'Payment failed during checkout.',
      detail: 'The transaction stopped before payment could be completed.',
    },
    {
      key: 'order_details_incorrect',
      label: 'Order details look incorrect.',
      detail: 'Items, quantity, or price on this order appear wrong.',
    },
  ],
  pending: [
    SUPPORT_HELP_OPTION,
    {
      key: 'payment_completed_still_pending',
      label: 'I have completed payment but the order is still pending.',
      detail: 'Payment was made but the order has not moved to processing.',
    },
    {
      key: 'payment_deducted_confirmation_delayed',
      label: 'Payment was deducted but confirmation is taking too long.',
      detail: 'My bank shows the payment but the order has not been confirmed yet.',
    },
    {
      key: 'charged_more_than_once',
      label: 'I was charged more than once.',
      detail: 'I noticed duplicate charge(s) for this order.',
    },
    {
      key: 'order_details_incorrect',
      label: 'Order details look incorrect.',
      detail: 'Items, quantity, or pricing appear incorrect.',
    },
  ],
  failed: [
    SUPPORT_HELP_OPTION,
    {
      key: 'failed_but_charged',
      label: 'Payment failed but I was charged.',
      detail: 'My bank shows a charge even though the payment failed.',
    },
    {
      key: 'charged_more_than_once',
      label: 'I was charged more than once.',
      detail: 'I noticed duplicate charge(s) for this order.',
    },
    {
      key: 'cannot_retry_payment',
      label: 'I cannot retry payment.',
      detail: 'The system is not allowing another payment attempt.',
    },
    {
      key: 'payment_keeps_failing',
      label: 'Payment keeps failing.',
      detail: 'Every attempt to pay results in an error.',
    },
  ],
  processing: [
    SUPPORT_HELP_OPTION,
    {
      key: 'processing_too_long',
      label: 'Order has been processing for too long.',
      detail: 'The order has not progressed for an unusual amount of time.',
    },
    {
      key: 'order_details_incorrect',
      label: 'Order details look incorrect.',
      detail: 'Items, quantity, or pricing appear different from what I ordered.',
    },
    {
      key: 'delivery_info_correction',
      label: 'Delivery information needs correction.',
      detail: 'My delivery address or contact details need updating.',
    },
  ],
  ready_to_ship: [
    SUPPORT_HELP_OPTION,
    {
      key: 'not_shipped_yet',
      label: 'Order has not been shipped yet.',
      detail: 'The order has stayed in ready-to-ship status for too long.',
    },
    {
      key: 'delivery_details_correction',
      label: 'Delivery details need correction.',
      detail: 'My address or contact information needs updating.',
    },
    {
      key: 'order_details_incorrect',
      label: 'Order details look incorrect.',
      detail: 'Items or quantities appear wrong.',
    },
  ],
  out_for_delivery: [
    SUPPORT_HELP_OPTION,
    {
      key: 'delivery_taking_too_long',
      label: 'Delivery is taking longer than expected.',
      detail: 'The order has been out for delivery for an unusually long time.',
    },
    {
      key: 'courier_cannot_reach',
      label: 'Courier cannot reach me.',
      detail: 'I may have missed a call or need to coordinate delivery.',
    },
    {
      key: 'tracking_incorrect',
      label: 'Tracking information looks incorrect.',
      detail: 'Delivery updates or tracking details appear wrong.',
    },
  ],
  delivered: [
    SUPPORT_HELP_OPTION,
    {
      key: 'not_received_order',
      label: 'I did not receive this order.',
      detail: 'The order is marked delivered but I have not received it.',
    },
    {
      key: 'item_damaged_defective',
      label: 'Item arrived damaged or defective.',
      detail: 'The item was damaged, broken, or not working.',
    },
    {
      key: 'wrong_item_delivered',
      label: 'Wrong item was delivered.',
      detail: 'The product received does not match what I ordered.',
    },
    {
      key: 'item_missing',
      label: 'Item missing from the package.',
      detail: 'Part of the order was not included in the delivery.',
    },
    {
      key: 'return_or_refund_request',
      label: 'I want to request a return or refund.',
      detail: 'I want to start a return or refund request for this order.',
    },
  ],
  refunded: [
    SUPPORT_HELP_OPTION,
    {
      key: 'refund_not_received',
      label: 'I have not received my refund yet.',
      detail: 'The refund was issued but it has not reached my account.',
    },
    {
      key: 'refund_amount_incorrect',
      label: 'Refund amount looks incorrect.',
      detail: 'The refunded amount does not match what I expected.',
    },
    {
      key: 'refund_method_incorrect',
      label: 'Refund method looks incorrect.',
      detail: 'The refund was sent to the wrong payment method.',
    },
  ],
  cancelled: [
    SUPPORT_HELP_OPTION,
    {
      key: 'charged_for_cancelled',
      label: 'I was charged for a cancelled order.',
      detail: 'My payment method was charged even though the order was cancelled.',
    },
    {
      key: 'cancelled_refund_not_received',
      label: 'Refund for cancelled order not received.',
      detail: 'The order was cancelled but the refund has not been received.',
    },
    {
      key: 'cancelled_without_request',
      label: 'Order was cancelled without my request.',
      detail: 'The order appears to have been cancelled unexpectedly.',
    },
  ],
}

const DEFAULT_REPORT_REASON_OPTION = SUPPORT_HELP_OPTION
const DEFAULT_REPORT_REASON_KEY = DEFAULT_REPORT_REASON_OPTION.key

const getReportReasonOptionsForStatus = (statusValue) => {
  const status = normalizeCustomerOrderStatusKey(statusValue)
  if (status === 'completed') return REPORT_REASON_OPTIONS_BY_STATUS.delivered
  if (status === 'paid') return REPORT_REASON_OPTIONS_BY_STATUS.processing
  return REPORT_REASON_OPTIONS_BY_STATUS[status] || REPORT_REASON_OPTIONS_BY_STATUS.processing
}

const RETURN_REASON_OPTIONS = [
  { key: 'defective_item', label: 'Defective item' },
  { key: 'wrong_item', label: 'Wrong item delivered' },
  { key: 'missing_parts', label: 'Missing parts or items' },
  { key: 'not_as_described', label: 'Item not as described' },
  { key: 'delivery_issue', label: 'Delivery issue' },
  { key: 'changed_mind', label: 'Changed my mind' },
  { key: 'other', label: 'Other reason' },
]

const MAX_RETURN_MEDIA_FILES = 6
const MAX_RETURN_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_RETURN_VIDEO_BYTES = 100 * 1024 * 1024
const RETURN_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const RETURN_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const CUSTOMER_CANCEL_ALLOWED_STATUS = new Set([
  'awaiting_payment',
  'failed',
])

const getReturnMediaValidationError = (file) => {
  const mediaType = String(file?.type || '').toLowerCase()
  const isImage = RETURN_IMAGE_TYPES.has(mediaType)
  const isVideo = RETURN_VIDEO_TYPES.has(mediaType)
  if (!isImage && !isVideo) return 'Only JPEG, PNG, WEBP, MP4, WEBM, and MOV files are allowed.'
  if (isImage && Number(file?.size || 0) > MAX_RETURN_IMAGE_BYTES) return 'Image size must be 5MB or less.'
  if (isVideo && Number(file?.size || 0) > MAX_RETURN_VIDEO_BYTES) return 'Video size must be 100MB or less.'
  return ''
}

const createEmptyReturnItemIssue = () => ({
  reasonKeys: [],
  customReason: '',
})

const DesktopOrderDetailsSkeleton = () => (
  <div className='grid grid-cols-[1.35fr_1fr] gap-3'>
    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
      <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3'>
        <div className='space-y-2'>
          <div className='h-4 w-44 animate-pulse rounded bg-slate-200' />
          <div className='h-3 w-28 animate-pulse rounded bg-slate-100' />
        </div>
        <div className='h-6 w-24 animate-pulse rounded-full bg-slate-100' />
      </div>
      <div className='px-4 pb-2 pt-2'>
        <div className='h-3 w-3/4 animate-pulse rounded bg-slate-100' />
      </div>

      <div className='border-b border-slate-200 bg-slate-50 px-4 py-2'>
        <div className='h-3 w-20 animate-pulse rounded bg-slate-200' />
      </div>
      <div>
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`desktop-item-skeleton-${index}`}
            className='grid grid-cols-[58px_1fr_auto_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0'
          >
            <div className='h-14 w-14 animate-pulse rounded-md bg-slate-100' />
            <div className='space-y-2'>
              <div className='h-3.5 w-48 animate-pulse rounded bg-slate-200' />
              <div className='h-3 w-24 animate-pulse rounded bg-slate-100' />
            </div>
            <div className='h-7 w-20 animate-pulse rounded border border-slate-200 bg-white' />
            <div className='space-y-2 text-right'>
              <div className='ml-auto h-3.5 w-16 animate-pulse rounded bg-slate-200' />
              <div className='ml-auto h-3 w-10 animate-pulse rounded bg-slate-100' />
            </div>
          </div>
        ))}
      </div>

      <div className='border-y border-slate-200 bg-slate-50 px-4 py-2'>
        <div className='h-3 w-24 animate-pulse rounded bg-slate-200' />
      </div>
      <div className='grid grid-cols-1 gap-3 border-b border-slate-200 px-4 py-3 sm:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`desktop-delivery-skeleton-${index}`} className='space-y-2'>
            <div className='h-3 w-16 animate-pulse rounded bg-slate-200' />
            <div className='h-3 w-full animate-pulse rounded bg-slate-100' />
          </div>
        ))}
      </div>

      <div className='border-b border-slate-200 bg-slate-50 px-4 py-2'>
        <div className='h-3 w-24 animate-pulse rounded bg-slate-200' />
      </div>
      <div className='grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`desktop-summary-skeleton-${index}`} className='space-y-2'>
            <div className='h-3 w-16 animate-pulse rounded bg-slate-200' />
            <div className='h-3.5 w-20 animate-pulse rounded bg-slate-100' />
          </div>
        ))}
      </div>
    </div>

    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
      <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3'>
        <div className='space-y-2'>
          <div className='h-4 w-28 animate-pulse rounded bg-slate-200' />
          <div className='h-3 w-24 animate-pulse rounded bg-slate-100' />
        </div>
        <div className='h-8 w-24 animate-pulse rounded-md bg-slate-100' />
      </div>
      <div className='border-b border-slate-200 bg-slate-50 px-4 py-2'>
        <div className='h-3 w-24 animate-pulse rounded bg-slate-200' />
      </div>
      <div className='px-4 py-3'>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={`desktop-activity-skeleton-${index}`} className='relative pl-6'>
            <span className='absolute left-0 top-1.5 h-4 w-4 animate-pulse rounded-full bg-slate-200' />
            <div className='pb-5'>
              <div className='h-3.5 w-36 animate-pulse rounded bg-slate-200' />
              <div className='mt-2 h-3 w-11/12 animate-pulse rounded bg-slate-100' />
            </div>
          </div>
        ))}
      </div>
      <div className='flex items-center gap-2 border-t border-slate-200 px-4 py-3'>
        <div className='h-10 flex-1 animate-pulse rounded-md bg-slate-900/12' />
        <div className='h-10 flex-1 animate-pulse rounded-md bg-slate-100' />
      </div>
    </div>
  </div>
)

const MobileOrderDetailsSkeleton = () => (
  <>
    <div className='flex items-start gap-2 px-1'>
      <div className='h-8 w-8 animate-pulse rounded-full bg-slate-200' />
      <div className='min-w-0 space-y-2'>
        <div className='h-4 w-36 animate-pulse rounded bg-slate-200' />
        <div className='h-3 w-24 animate-pulse rounded bg-slate-100' />
      </div>
    </div>

    <article className='rounded-xl border border-slate-200 bg-white p-3'>
      <div className='space-y-2'>
        <div className='h-3.5 w-24 animate-pulse rounded bg-slate-200' />
        <div className='h-3 w-11/12 animate-pulse rounded bg-slate-100' />
      </div>
      <div className='mt-3 space-y-2 border-t border-slate-200 pt-3'>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={`mobile-detail-line-${index}`} className='flex items-center justify-between gap-3'>
            <div className='h-3 w-20 animate-pulse rounded bg-slate-100' />
            <div className='h-3 w-24 animate-pulse rounded bg-slate-200' />
          </div>
        ))}
      </div>
    </article>

    <div>
      <div className='h-5 w-40 animate-pulse rounded bg-slate-200' />
      <div className='mt-2 space-y-2'>
        {Array.from({ length: 2 }).map((_, index) => (
          <article key={`mobile-product-skeleton-${index}`} className='rounded-xl border border-slate-200 bg-white p-3'>
            <div className='grid grid-cols-[96px_1fr_auto] gap-2.5'>
              <div className='h-24 w-24 animate-pulse rounded-md bg-slate-100' />
              <div className='space-y-2'>
                <div className='h-3 w-16 animate-pulse rounded bg-slate-100' />
                <div className='h-3.5 w-32 animate-pulse rounded bg-slate-200' />
                <div className='h-3 w-20 animate-pulse rounded bg-slate-100' />
                <div className='h-3 w-14 animate-pulse rounded bg-slate-100' />
              </div>
              <div className='flex min-h-[96px] flex-col items-end justify-between gap-2'>
                <div className='h-3.5 w-16 animate-pulse rounded bg-slate-200' />
                <div className='h-3 w-12 animate-pulse rounded bg-slate-100' />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </>
)

const buildTrackingSteps = (statusKey) => {
  const status = normalizeTrackingStatus(statusKey)
  const terminalMessage = TERMINAL_STATUS_COPY[status] || ''
  const isTerminal = Boolean(terminalMessage)
  const currentIndex = Number(CURRENT_STEP_INDEX_BY_STATUS[status] ?? -1)
  const completedForTerminal = getCompletedStepIndexForTerminalStatus(status)

  const steps = TRACKING_STEPS.map((step, index) => {
    if (isTerminal) {
      const isComplete = index <= completedForTerminal
      return {
        ...step,
        isActive: isComplete,
        isCurrent: false,
        description: isComplete ? 'Completed before status change.' : terminalMessage,
      }
    }

    const isComplete = currentIndex >= 0 && index < currentIndex
    const isCurrent = currentIndex >= 0 && index === currentIndex
    const isActive = isComplete || isCurrent
    let description = step.pendingText

    if (status === 'awaiting_payment') {
      if (index === 0) description = 'Waiting for your payment confirmation.'
      return { ...step, isActive: false, isCurrent: false, description }
    }

    if (isComplete) description = 'Completed.'
    if (isCurrent) description = step.currentText

    return {
      ...step,
      isActive,
      isCurrent,
      description,
    }
  })

  return {
    steps,
    terminalMessage,
  }
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { pushAlert } = useAlerts()
  const { formatMoney } = useUserI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false)
  const [isReturnSheetOpen, setIsReturnSheetOpen] = useState(false)
  const [isMobileActivitySheetOpen, setIsMobileActivitySheetOpen] = useState(false)
  const [selectedReportReason, setSelectedReportReason] = useState(DEFAULT_REPORT_REASON_KEY)
  const [selectedReturnItemIds, setSelectedReturnItemIds] = useState([])
  const [returnIssueByItem, setReturnIssueByItem] = useState({})
  const [returnMediaFiles, setReturnMediaFiles] = useState([])
  const [isSendingReturnRequest, setIsSendingReturnRequest] = useState(false)
  const [isCancellingOrder, setIsCancellingOrder] = useState(false)
  const [isReorderingOrder, setIsReorderingOrder] = useState(false)
  const [reportSheetDragY, setReportSheetDragY] = useState(0)
  const [isReportSheetDragging, setIsReportSheetDragging] = useState(false)
  const [mobileActivitySheetDragY, setMobileActivitySheetDragY] = useState(0)
  const [isMobileActivitySheetDragging, setIsMobileActivitySheetDragging] = useState(false)
  const returnMediaInputRef = useRef(null)
  const reportSheetGestureRef = useRef({
    pointerId: null,
    startY: 0,
    dragY: 0,
  })
  const mobileActivityGestureRef = useRef({
    pointerId: null,
    startY: 0,
    dragY: 0,
  })

  const orderId = String(params?.orderId || '').trim()

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/user/orders/${orderId}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!active) return
        if (response.status === 401) {
          router.push(`/login?next=/UserBackend/orders/${orderId}`)
          return
        }
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load order details.')
        }
        setOrder(payload?.order || null)
      } catch (nextError) {
        if (!active) return
        setOrder(null)
        setError(nextError?.message || 'Unable to load order details.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    if (orderId) {
      void load()
    }

    return () => {
      active = false
    }
  }, [orderId, router])

  const statusTone = useMemo(() => {
    const status = normalizeCustomerOrderStatusKey(order?.statusKey || order?.status)
    if (status === 'delivered') return 'bg-emerald-100 text-emerald-700'
    if (status === 'out_for_delivery') return 'bg-indigo-100 text-indigo-700'
    if (status === 'awaiting_payment') return 'bg-amber-100 text-amber-700'
    if (status === 'processing' || status === 'pending') return 'bg-amber-100 text-amber-700'
    if (status === 'failed') return 'bg-rose-100 text-rose-700'
    if (status === 'cancelled') return 'bg-slate-200 text-slate-700'
    return 'bg-amber-100 text-amber-700'
  }, [order?.statusKey, order?.status])

  const statusLabel = useMemo(
    () => getCustomerOrderStatusLabel(order?.statusKey || order?.status),
    [order?.statusKey, order?.status],
  )

  const statusMessage = useMemo(
    () => getCustomerOrderStatusMessage(order?.statusKey || order?.status),
    [order?.statusKey, order?.status],
  )
  const returnEligibleItems = useMemo(
    () =>
      Array.isArray(order?.items)
        ? order.items.filter((item) => Boolean(item?.isReturnEligible))
        : [],
    [order?.items],
  )
  const returnCapableItems = useMemo(
    () =>
      Array.isArray(order?.items)
        ? order.items.filter((item) => Boolean(item?.isReturnable || item?.isProtectionCovered))
        : [],
    [order?.items],
  )
  const notReturnableItems = useMemo(
    () =>
      returnCapableItems.filter((item) => !item?.isReturnEligible),
    [returnCapableItems],
  )
  const selectedReturnItems = useMemo(
    () =>
      returnEligibleItems.filter((item) => selectedReturnItemIds.includes(String(item?.id || ''))),
    [returnEligibleItems, selectedReturnItemIds],
  )
  const canSubmitReturnRequest = useMemo(() => {
    if (selectedReturnItems.length === 0 || isSendingReturnRequest) return false
    return selectedReturnItems.every((item) => {
      const itemId = String(item?.id || '')
      const issue = returnIssueByItem[itemId] || createEmptyReturnItemIssue()
      const hasReason = Array.isArray(issue.reasonKeys) && issue.reasonKeys.length > 0
      const hasTypedReason = Boolean(String(issue.customReason || '').trim())
      return hasReason || hasTypedReason
    })
  }, [isSendingReturnRequest, returnIssueByItem, selectedReturnItems])

  const isRetryPaymentStatus = useMemo(() => {
    const status = normalizeCustomerOrderStatusKey(order?.statusKey || order?.status)
    const paymentStatus = String(order?.paymentStatus || '').trim().toLowerCase()
    if (paymentStatus === 'failed') return true
    return status === 'awaiting_payment' || status === 'failed' || status === 'payment_failed'
  }, [order?.statusKey, order?.status, order?.paymentStatus])

  const primaryActionLabel = useMemo(
    () => (isRetryPaymentStatus ? 'Retry payment' : 'Track order'),
    [isRetryPaymentStatus],
  )

  const canReviewOrder = useMemo(() => {
    const status = String(order?.paymentStatus || '').toLowerCase()
    return (
      status === 'paid' ||
      String(order?.status || '').toLowerCase() === 'completed' ||
      String(order?.statusKey || '').toLowerCase() === 'delivered'
    )
  }, [order?.paymentStatus, order?.status, order?.statusKey])

  const hasOrderProtection = useMemo(() => Number(order?.protectionFee || 0) > 0, [order?.protectionFee])
  const effectiveReportStatusKey = useMemo(() => {
    const status = normalizeCustomerOrderStatusKey(order?.statusKey || order?.status)
    const paymentStatus = String(order?.paymentStatus || '').trim().toLowerCase()
    if (paymentStatus === 'failed') return 'failed'
    return status
  }, [order?.statusKey, order?.status, order?.paymentStatus])
  const canCancelOrder = useMemo(
    () => CUSTOMER_CANCEL_ALLOWED_STATUS.has(normalizeCustomerOrderStatusKey(effectiveReportStatusKey)),
    [effectiveReportStatusKey],
  )
  const isDeliveredOrder = useMemo(() => {
    const status = normalizeCustomerOrderStatusKey(order?.statusKey || order?.status)
    return status === 'delivered' || status === 'completed'
  }, [order?.statusKey, order?.status])
  const showMobileReportIcon = useMemo(() => true, [])
  const availableReportReasonOptions = useMemo(() => {
    return getReportReasonOptionsForStatus(effectiveReportStatusKey)
  }, [effectiveReportStatusKey])
  const protectionEligibleItems = useMemo(
    () =>
      returnEligibleItems.filter((item) => Boolean(item?.isProtectionEligible)),
    [returnEligibleItems],
  )
  const returnPolicyEligibleItems = useMemo(
    () =>
      returnEligibleItems.filter((item) => Boolean(item?.isReturnPolicyEligible)),
    [returnEligibleItems],
  )
  const returnPolicyOnlyItems = useMemo(
    () =>
      returnPolicyEligibleItems.filter((item) => !item?.isProtectionEligible),
    [returnPolicyEligibleItems],
  )
  const isProtectionExpired = useMemo(() => {
    if (!hasOrderProtection) return false
    if (!String(order?.deliveredAt || '').trim()) return false
    return order?.isProtectionWindowOpen === false
  }, [hasOrderProtection, order?.deliveredAt, order?.isProtectionWindowOpen])
  const protectionDisplayState = useMemo(() => {
    const status = normalizeCustomerOrderStatusKey(effectiveReportStatusKey)
    if (status === 'failed' || status === 'cancelled') return 'failed'
    if (status === 'refunded') return 'expired'
    if (status === 'awaiting_payment' || status === 'pending') return 'pending'
    if (
      status === 'processing' ||
      status === 'ready_to_ship' ||
      status === 'out_for_delivery' ||
      status === 'delivered' ||
      status === 'completed'
    ) {
      return 'protected'
    }
    return isProtectionExpired ? 'expired' : 'protected'
  }, [effectiveReportStatusKey, isProtectionExpired])
  const protectionBadgeLabel = useMemo(() => {
    if (protectionDisplayState === 'failed') return 'Order protection failed'
    if (protectionDisplayState === 'pending') return 'Order protection pending'
    if (protectionDisplayState === 'expired') return 'Order protection expired'
    return 'Order protected'
  }, [protectionDisplayState])
  const protectionBadgeTone = useMemo(() => {
    if (protectionDisplayState === 'failed') return 'text-rose-700'
    if (protectionDisplayState === 'pending' || protectionDisplayState === 'expired') {
      return 'text-amber-700'
    }
    return 'text-emerald-700'
  }, [protectionDisplayState])

  useEffect(() => {
    if (
      availableReportReasonOptions.length > 0 &&
      !availableReportReasonOptions.some((option) => option.key === selectedReportReason)
    ) {
      setSelectedReportReason(availableReportReasonOptions[0].key)
    }
  }, [availableReportReasonOptions, selectedReportReason])

  useEffect(() => {
    if (isReportSheetOpen) return
    reportSheetGestureRef.current.pointerId = null
    reportSheetGestureRef.current.startY = 0
    reportSheetGestureRef.current.dragY = 0
    setIsReportSheetDragging(false)
    setReportSheetDragY(0)
  }, [isReportSheetOpen])

  useEffect(() => {
    if (isMobileActivitySheetOpen) return
    mobileActivityGestureRef.current.pointerId = null
    mobileActivityGestureRef.current.startY = 0
    mobileActivityGestureRef.current.dragY = 0
    setIsMobileActivitySheetDragging(false)
    setMobileActivitySheetDragY(0)
  }, [isMobileActivitySheetOpen])

  useEffect(() => {
    if (!isReturnSheetOpen) return
    const eligibleIds = new Set(returnEligibleItems.map((item) => String(item?.id || '')).filter(Boolean))
    setSelectedReturnItemIds((previous) => previous.filter((itemId) => eligibleIds.has(itemId)))
    setReturnIssueByItem((previous) => {
      const next = {}
      Object.entries(previous || {}).forEach(([itemId, issue]) => {
        if (eligibleIds.has(itemId)) {
          next[itemId] = issue
        }
      })
      return next
    })
  }, [isReturnSheetOpen, returnEligibleItems])

  const buildHelpCenterQuery = ({
    prefill = '',
    reportReasonKey = '',
    reportReasonLabel = '',
    autoSend = false,
  }) => {
    const next = new URLSearchParams()
    next.set('help_center', '1')
    const orderIdValue = String(order?.id || '').trim()
    const orderNumberValue = String(order?.orderNumber || '').trim()
    const trackIdValue = String(order?.trackId || '').trim()
    const statusValue = String(order?.status || '').trim()
    if (orderIdValue) next.set('order_id', orderIdValue)
    if (orderNumberValue) next.set('order_number', orderNumberValue)
    if (trackIdValue) next.set('track_id', trackIdValue)
    if (statusValue) next.set('order_status', statusValue)
    if (reportReasonKey) next.set('report_reason', reportReasonKey)
    if (reportReasonLabel) next.set('report_reason_label', reportReasonLabel)
    if (prefill) next.set('prefill', prefill)
    if (autoSend) next.set('auto_send', '1')
    return next
  }

  const handlePrimaryAction = () => {
    if (isRetryPaymentStatus) {
      const reference = String(order?.paystackReference || '').trim()
      if (reference) {
        router.push(`/checkout/awaiting-payment?reference=${encodeURIComponent(reference)}`)
        return
      }
      router.push('/checkout/payment')
      return
    }
    if (typeof window !== 'undefined' && window.innerWidth < 641) {
      setIsMobileActivitySheetOpen(true)
      return
    }
    const activityCard = Array.from(
      document.querySelectorAll("[data-order-activity-card='true']"),
    ).find((node) => node instanceof HTMLElement && node.getClientRects().length > 0)
    if (activityCard && typeof activityCard.scrollIntoView === 'function') {
      activityCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const closeReturnSheet = () => {
    if (isSendingReturnRequest) return
    setIsReturnSheetOpen(false)
    setSelectedReturnItemIds([])
    setReturnIssueByItem({})
    setReturnMediaFiles([])
    if (returnMediaInputRef.current) {
      returnMediaInputRef.current.value = ''
    }
  }

  const getReturnBlockedReason = (item) => {
    const status = normalizeCustomerOrderStatusKey(order?.statusKey || order?.status)
    if (status !== 'delivered') return 'You can only return delivered items.'
    const protectionCovered = Boolean(item?.isProtectionCovered)
    const returnable = Boolean(item?.isReturnable)
    const protectionOpen = order?.isProtectionWindowOpen === true
    const returnOpen = order?.isReturnWindowOpen === true
    if (protectionCovered && !protectionOpen && returnable && !returnOpen) {
      return 'Order protection and return windows have expired.'
    }
    if (protectionCovered && !protectionOpen) return 'Order protection has expired.'
    if (returnable && !returnOpen) return 'Return window has expired.'
    return 'This product is not currently returnable.'
  }

  const openReportSheet = () => {
    setSelectedReportReason((prev) => {
      if (availableReportReasonOptions.some((option) => option.key === prev)) return prev
      return availableReportReasonOptions[0]?.key || ''
    })
    setIsReportSheetOpen(true)
  }

  const handleReportSheetDragStart = (event) => {
    if (event.pointerType === 'mouse') return
    setIsReportSheetDragging(true)
    reportSheetGestureRef.current.pointerId = event.pointerId
    reportSheetGestureRef.current.startY = event.clientY
    reportSheetGestureRef.current.dragY = 0
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleReportSheetDragMove = (event) => {
    if (!isReportSheetDragging) return
    if (reportSheetGestureRef.current.pointerId !== event.pointerId) return
    const delta = Math.max(0, event.clientY - reportSheetGestureRef.current.startY)
    const next = Math.min(delta, 180)
    reportSheetGestureRef.current.dragY = next
    setReportSheetDragY(next)
  }

  const handleReportSheetDragEnd = (event) => {
    if (reportSheetGestureRef.current.pointerId !== event.pointerId) return
    const shouldClose = reportSheetGestureRef.current.dragY > 72
    reportSheetGestureRef.current.pointerId = null
    reportSheetGestureRef.current.startY = 0
    reportSheetGestureRef.current.dragY = 0
    setIsReportSheetDragging(false)
    setReportSheetDragY(0)
    if (shouldClose) setIsReportSheetOpen(false)
  }

  const handleMobileActivityDragStart = (event) => {
    if (event.pointerType === 'mouse') return
    setIsMobileActivitySheetDragging(true)
    mobileActivityGestureRef.current.pointerId = event.pointerId
    mobileActivityGestureRef.current.startY = event.clientY
    mobileActivityGestureRef.current.dragY = 0
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleMobileActivityDragMove = (event) => {
    if (!isMobileActivitySheetDragging) return
    if (mobileActivityGestureRef.current.pointerId !== event.pointerId) return
    const delta = Math.max(0, event.clientY - mobileActivityGestureRef.current.startY)
    const next = Math.min(delta, 180)
    mobileActivityGestureRef.current.dragY = next
    setMobileActivitySheetDragY(next)
  }

  const handleMobileActivityDragEnd = (event) => {
    if (mobileActivityGestureRef.current.pointerId !== event.pointerId) return
    const shouldClose = mobileActivityGestureRef.current.dragY > 72
    mobileActivityGestureRef.current.pointerId = null
    mobileActivityGestureRef.current.startY = 0
    mobileActivityGestureRef.current.dragY = 0
    setIsMobileActivitySheetDragging(false)
    setMobileActivitySheetDragY(0)
    if (shouldClose) setIsMobileActivitySheetOpen(false)
  }

  const handleSendReport = () => {
    const selectedReason =
      availableReportReasonOptions.find((option) => option.key === selectedReportReason) ||
      availableReportReasonOptions[0] ||
      DEFAULT_REPORT_REASON_OPTION
    const orderRef =
      String(order?.orderNumber || '').trim() ||
      String(order?.id || '').trim() ||
      'this order'
    const isGeneralHelpReason = selectedReason.key === 'need_assistance'
    const seed = isGeneralHelpReason
      ? ''
      : [
          `Hello Support, I want to report an issue with order ${orderRef}.`,
          `Issue: ${selectedReason.label}`,
          selectedReason.detail,
        ].join(' ')
    const params = buildHelpCenterQuery({
      prefill: seed,
      reportReasonKey: selectedReason.key,
      reportReasonLabel: selectedReason.label,
      autoSend: !isGeneralHelpReason,
    })
    setIsReportSheetOpen(false)
    router.push(`/UserBackend/messages?${params.toString()}`)
  }

  const handleCancelOrder = () => {
    if (!canCancelOrder || isCancellingOrder) return
    setIsCancellingOrder(true)
    ;(async () => {
      try {
        const response = await fetch(`/api/user/orders/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-no-global-error-alert': '1',
          },
          body: JSON.stringify({ action: 'cancel' }),
        }).catch(() => null)

        if (!response) {
          throw new Error('Unable to cancel order right now.')
        }
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(String(payload?.error || 'Unable to cancel order.'))
        }

        setOrder((previous) => {
          if (!previous) return previous
          return {
            ...previous,
            statusKey: 'cancelled',
            status: 'Cancelled',
          }
        })
        pushAlert({
          type: 'success',
          title: 'Order cancelled',
          message: 'This order was cancelled successfully.',
        })
      } catch (cancelError) {
        pushAlert({
          type: 'error',
          title: 'Cancel failed',
          message: String(cancelError?.message || 'Unable to cancel order.'),
        })
      } finally {
        setIsCancellingOrder(false)
      }
    })()
  }

  const handleReorderOrder = () => {
    if (isReorderingOrder) return
    const safeOrderId = String(order?.id || '').trim()
    if (!safeOrderId) return
    setIsReorderingOrder(true)
    ;(async () => {
      try {
        const response = await fetch('/api/user/orders/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-no-global-error-alert': '1',
          },
          body: JSON.stringify({ orderId: safeOrderId }),
        }).catch(() => null)

        if (!response) {
          throw new Error('Unable to reorder items right now.')
        }
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(String(payload?.error || 'Unable to reorder items.'))
        }

        const addedQuantity = Math.max(0, Number(payload?.addedQuantity || 0))
        if (addedQuantity > 0) {
          pushAlert({
            type: 'success',
            title: 'Re-order complete',
            message: `Added ${addedQuantity} item${addedQuantity === 1 ? '' : 's'} to your cart.`,
          })
          return
        }
        pushAlert({
          type: 'warning',
          title: 'Re-order result',
          message: 'No items were added to your cart.',
        })
      } catch (reorderError) {
        pushAlert({
          type: 'error',
          title: 'Re-order failed',
          message: String(reorderError?.message || 'Unable to reorder items.'),
        })
      } finally {
        setIsReorderingOrder(false)
      }
    })()
  }

  const handleRequestReturn = (item) => {
    const itemId = String(item?.id || '').trim()
    if (!itemId) return
    setSelectedReturnItemIds((previous) => {
      if (previous.includes(itemId)) return previous
      return [...previous, itemId]
    })
    setReturnIssueByItem((previous) => ({
      ...previous,
      [itemId]: previous[itemId] || createEmptyReturnItemIssue(),
    }))
    setIsReturnSheetOpen(true)
  }

  const toggleReturnItemSelection = (itemId, checked) => {
    const nextItemId = String(itemId || '').trim()
    if (!nextItemId) return
    setSelectedReturnItemIds((previous) => {
      if (checked) {
        if (previous.includes(nextItemId)) return previous
        return [...previous, nextItemId]
      }
      return previous.filter((id) => id !== nextItemId)
    })
    setReturnIssueByItem((previous) => {
      if (checked) {
        return {
          ...previous,
          [nextItemId]: previous[nextItemId] || createEmptyReturnItemIssue(),
        }
      }
      const next = { ...previous }
      delete next[nextItemId]
      return next
    })
  }

  const toggleReturnReasonForItem = (itemId, reasonKey, checked) => {
    const nextItemId = String(itemId || '').trim()
    const nextReasonKey = String(reasonKey || '').trim()
    if (!nextItemId || !nextReasonKey) return
    setReturnIssueByItem((previous) => {
      const current = previous[nextItemId] || createEmptyReturnItemIssue()
      const nextReasons = Array.isArray(current.reasonKeys) ? [...current.reasonKeys] : []
      if (checked) {
        if (!nextReasons.includes(nextReasonKey)) nextReasons.push(nextReasonKey)
      } else {
        const removeIndex = nextReasons.indexOf(nextReasonKey)
        if (removeIndex >= 0) nextReasons.splice(removeIndex, 1)
      }
      return {
        ...previous,
        [nextItemId]: {
          ...current,
          reasonKeys: nextReasons,
        },
      }
    })
  }

  const setTypedReturnReasonForItem = (itemId, value) => {
    const nextItemId = String(itemId || '').trim()
    if (!nextItemId) return
    setReturnIssueByItem((previous) => {
      const current = previous[nextItemId] || createEmptyReturnItemIssue()
      return {
        ...previous,
        [nextItemId]: {
          ...current,
          customReason: String(value || ''),
        },
      }
    })
  }

  const handleReturnMediaChange = (event) => {
    const selectedFiles = Array.from(event?.target?.files || [])
    if (!selectedFiles.length) return

    const next = [...returnMediaFiles]
    const alertQueue = []
    for (const file of selectedFiles) {
      if (next.length >= MAX_RETURN_MEDIA_FILES) {
        alertQueue.push({
          type: 'error',
          title: 'Too many files',
          message: `You can upload up to ${MAX_RETURN_MEDIA_FILES} files.`,
        })
        break
      }
      const validationError = getReturnMediaValidationError(file)
      if (validationError) {
        alertQueue.push({
          type: 'error',
          title: 'Invalid file',
          message: validationError,
        })
        continue
      }
      const isDuplicate = next.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified &&
          existing.type === file.type,
      )
      if (!isDuplicate) {
        next.push(file)
      }
    }
    setReturnMediaFiles(next)
    alertQueue.forEach((alert) => pushAlert(alert))

    if (event?.target) {
      event.target.value = ''
    }
  }

  const handleRemoveReturnMedia = (indexToRemove) => {
    setReturnMediaFiles((previous) => previous.filter((_, index) => index !== indexToRemove))
    if (returnMediaInputRef.current) {
      returnMediaInputRef.current.value = ''
    }
  }

  const handleSubmitReturnRequest = async () => {
    if (!canSubmitReturnRequest || selectedReturnItems.length === 0) return
    const formData = new FormData()
    formData.append('orderId', String(order?.id || ''))
    formData.append('orderNumber', String(order?.orderNumber || ''))
    formData.append('trackId', String(order?.trackId || ''))
    formData.append('orderStatus', String(order?.status || ''))
    selectedReturnItems
      .map((item) => String(item?.id || ''))
      .filter(Boolean)
      .forEach((itemId) => formData.append('itemIds', itemId))
    const itemReports = selectedReturnItems.map((item) => {
      const itemId = String(item?.id || '')
      const issue = returnIssueByItem[itemId] || createEmptyReturnItemIssue()
      return {
        itemId,
        reasonKeys: Array.isArray(issue.reasonKeys) ? issue.reasonKeys : [],
        customReason: String(issue.customReason || '').trim(),
      }
    })
    formData.append('itemReports', JSON.stringify(itemReports))
    returnMediaFiles.forEach((file) => {
      formData.append('files', file)
    })

    setIsSendingReturnRequest(true)
    try {
      const response = await fetch('/api/chat/help-center/return-request', {
        method: 'POST',
        headers: {
          'x-no-global-error-alert': '1',
        },
        body: formData,
      }).catch(() => null)

      if (!response) {
        throw new Error('Unable to send return request right now.')
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(String(payload?.error || 'Unable to send return request.'))
      }

      setIsReturnSheetOpen(false)
      setSelectedReturnItemIds([])
      setReturnIssueByItem({})
      setReturnMediaFiles([])
      if (returnMediaInputRef.current) {
        returnMediaInputRef.current.value = ''
      }
      pushAlert({
        type: 'success',
        title: 'Return request sent',
        message: 'Your request was sent to Help Center.',
        timeoutMs: 9000,
        actionLabel: 'View request',
        onAction: () => {
          router.push('/UserBackend/messages?help_center=1')
        },
      })
    } catch (submitError) {
      pushAlert({
        type: 'error',
        title: 'Return request failed',
        message: String(submitError?.message || 'Unable to send return request.'),
      })
    } finally {
      setIsSendingReturnRequest(false)
    }
  }

  const renderReturnItemSelection = ({ item, keyPrefix, selectedClassName, unselectedClassName, accentClassName, coverageText }) => {
    const itemId = String(item?.id || '')
    const isSelected = selectedReturnItemIds.includes(itemId)
    const issue = returnIssueByItem[itemId] || createEmptyReturnItemIssue()

    return (
      <article
        key={`${keyPrefix}-${item.id}`}
        className={`rounded-xl border px-3 py-2.5 ${isSelected ? selectedClassName : unselectedClassName}`}
      >
        <label className='flex cursor-pointer items-start gap-2'>
          <input
            type='checkbox'
            name='return-item'
            checked={isSelected}
            onChange={(event) => toggleReturnItemSelection(itemId, event.target.checked)}
            className={`mt-0.5 ${accentClassName}`}
          />
          <span className='min-w-0'>
            <span className='block text-sm font-semibold text-slate-900'>{item.name}</span>
            <span className='mt-0.5 block text-xs text-slate-600'>{coverageText}</span>
          </span>
        </label>

        {isSelected ? (
          <div className='mt-2.5 rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-600'>Why are you returning this item?</p>
            <div className='mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2'>
              {RETURN_REASON_OPTIONS.map((reasonOption) => (
                <label key={`${itemId}-${reasonOption.key}`} className='flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-slate-50'>
                  <input
                    type='checkbox'
                    name={`return-reason-${itemId}`}
                    checked={Array.isArray(issue.reasonKeys) && issue.reasonKeys.includes(reasonOption.key)}
                    onChange={(event) => toggleReturnReasonForItem(itemId, reasonOption.key, event.target.checked)}
                    className='mt-0.5 accent-[#b16a3d]'
                  />
                  <span className='text-xs text-slate-700'>{reasonOption.label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={String(issue.customReason || '')}
              onChange={(event) => setTypedReturnReasonForItem(itemId, event.target.value)}
              rows={2}
              maxLength={600}
              placeholder='Type reason for this product (optional).'
              className='mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#b16a3d] focus:outline-none focus:ring-1 focus:ring-[#b16a3d]'
            />
          </div>
        ) : null}
      </article>
    )
  }

  const trackingActivity = buildTrackingSteps(order?.statusKey || order?.status)
  const trackingSteps = trackingActivity.steps
  const getItemReviewHref = (item) => {
    const productSlug = String(item?.productSlug || '').trim()
    if (!productSlug) return '/UserBackend/reviews'
    return `/product/${encodeURIComponent(productSlug)}#reviews-section`
  }

  return (
    <section className='min-h-screen bg-[#f4f5f7]'>
      <div className='mx-auto hidden w-full max-w-7xl px-4 pb-10 pt-4 min-[641px]:block'>
        <div className='mb-3 flex items-center justify-between'>
          <div className='flex items-center gap-2 text-sm text-slate-700'>
            <Link href='/UserBackend/orders' className='inline-flex items-center gap-1 hover:text-slate-900'>
              <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='m12.5 4.5-5 5 5 5' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              <span>Back</span>
            </Link>
            <span className='text-slate-400'>|</span>
            <p className='font-medium text-slate-900'>Order details</p>
          </div>
          <button
            type='button'
            onClick={openReportSheet}
            className='inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700'
          >
            Report issue
          </button>
        </div>

        {error ? (
          <div className='mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</div>
        ) : null}
        {isLoading ? <DesktopOrderDetailsSkeleton /> : null}

        {!isLoading && order ? (
          <div className='grid grid-cols-[1.35fr_1fr] gap-3'>
            <div data-order-activity-card='true' className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
              <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>Order ID: {order.orderNumber}</p>
                  <p className='mt-0.5 text-xs text-slate-500'>{formatDateTimeLabel(order.createdAt)}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone}`}>
                  {statusLabel}
                </span>
              </div>
              <p className='px-4 pb-2 text-xs text-slate-500'>{statusMessage}</p>

              <div className='border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Order info</div>
              <div>
                {(order.items || []).map((item) => (
                  <article
                    key={item.id}
                    className='grid grid-cols-[58px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-3 last:border-b-0'
                  >
                    <div className='relative h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                      {item.image ? (
                        <Image src={item.image} alt={item.name || 'Product'} fill sizes='56px' className='object-cover' />
                      ) : null}
                    </div>
                    <div className='min-w-0'>
                      <p className='line-clamp-1 text-sm font-semibold text-slate-900'>{item.name}</p>
                      <p className='line-clamp-1 text-xs text-slate-500'>{item.variation || 'Standard option'}</p>
                      {item.isProtectionCovered ? (
                        <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${protectionBadgeTone}`}>
                          <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                            <path fillRule='evenodd' clipRule='evenodd' d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z' fill='currentColor'></path>
                          </svg>
                          <span>{protectionBadgeLabel}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className='self-start text-right'>
                      <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                      <p className='text-xs text-slate-500'>Qty: {item.quantity}</p>
                    </div>
                    <div className='col-span-3 flex flex-wrap items-center gap-1.5 pl-[70px]'>
                      {item.isReturnable || item.isProtectionCovered ? (
                        <button
                          type='button'
                          onClick={() => handleRequestReturn(item)}
                          className='inline-flex h-7 items-center justify-center rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-700'
                        >
                          {item.isReturnEligible ? 'Return' : 'Returnable'}
                        </button>
                      ) : (
                        <span className='inline-flex h-7 items-center justify-center rounded border border-slate-200 px-2.5 text-xs font-semibold text-slate-400'>
                          Not returnable
                        </span>
                      )}
                      {canReviewOrder ? (
                        <Link
                          href={getItemReviewHref(item)}
                          className='inline-flex h-7 items-center justify-center rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-700'
                        >
                          Add review
                        </Link>
                      ) : (
                        <span className='inline-flex h-7 items-center justify-center rounded border border-slate-200 px-2.5 text-xs font-semibold text-slate-400'>
                          Add review
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className='border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Delivery info</div>
              <div className='grid grid-cols-1 gap-3 border-b border-slate-200 px-4 py-3 text-sm sm:grid-cols-3'>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Address</p>
                  <p className='mt-1 whitespace-normal break-words text-slate-800'>{order.addressLabel || 'Address not available'}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Contact</p>
                  <p className='mt-1 whitespace-normal break-words text-slate-800'>{order.contactPhone || '-'}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Delivery method</p>
                  <p className='mt-1 whitespace-normal break-words text-slate-800'>{order.deliveryMethod || 'Standard delivery'}</p>
                </div>
              </div>

              <div className='border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Order summary</div>
              <div
                className={`grid grid-cols-2 gap-3 px-4 py-3 text-sm text-slate-700 sm:grid-cols-3 ${
                  hasOrderProtection ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                }`}
              >
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Payment type</p>
                  <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{order.paymentMode}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Subtotal</p>
                  <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{formatMoney(order.subtotal)}</p>
                </div>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Shipping</p>
                  <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{Number(order.shippingFee || 0) > 0 ? formatMoney(order.shippingFee) : 'FREE'}</p>
                </div>
                {hasOrderProtection ? (
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>
                      {protectionBadgeLabel}
                    </p>
                    <p className='mt-1 whitespace-normal break-words font-semibold text-slate-900'>{formatMoney(order.protectionFee)}</p>
                  </div>
                ) : null}
                <div className='min-w-0'>
                  <p className='text-xs font-semibold uppercase tracking-[0.04em] text-slate-500'>Total</p>
                  <p className='mt-1 whitespace-normal break-words text-base font-bold text-slate-900'>{formatMoney(order.totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
              <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900'>Order Inquiry</p>
                  <p className='mt-0.5 text-xs text-slate-500'>Order Ref: {order.trackId}</p>
                </div>
                {canCancelOrder ? (
                  <button
                    type='button'
                    onClick={handleCancelOrder}
                    disabled={isCancellingOrder}
                    className='inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {isCancellingOrder ? 'Cancelling...' : 'Cancel order'}
                  </button>
                ) : null}
              </div>
              <div className='border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500'>Order Activity</div>
              <div className='px-4 py-3'>
                {trackingActivity.terminalMessage ? (
                  <div className='mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700'>
                    {trackingActivity.terminalMessage}
                  </div>
                ) : null}
                {trackingSteps.map((step, index) => (
                  <div key={`${step.label}-${index}`} className='relative pl-6'>
                    {index < trackingSteps.length - 1 ? (
                      <span
                        className={`absolute left-[7px] top-4 h-[calc(100%-4px)] w-[2.5px] rounded-full ${
                          step.isActive && trackingSteps[index + 1]?.isActive ? 'bg-sky-400' : 'bg-slate-300'
                        }`}
                        aria-hidden='true'
                      />
                    ) : null}
                    <span
                      className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 ${
                        step.isActive ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'
                      }`}
                      aria-hidden='true'
                    />
                    <div className='pb-5'>
                      <p className={`text-sm font-semibold ${step.isActive ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
                      <p className='text-xs text-slate-500'>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex items-center gap-2 border-t border-slate-200 px-4 py-3'>
                <button
                  type='button'
                  onClick={handlePrimaryAction}
                  className='inline-flex h-10 flex-1 items-center justify-center rounded-md bg-[#1d4ed8] text-sm font-semibold text-white'
                >
                  {primaryActionLabel}
                </button>
                <button
                  type='button'
                  onClick={isDeliveredOrder ? handleReorderOrder : openReportSheet}
                  disabled={isDeliveredOrder && isReorderingOrder}
                  className='inline-flex h-10 flex-1 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isDeliveredOrder ? (isReorderingOrder ? 'Re-ordering...' : 'Re-order') : 'Report'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className='w-full pb-28 min-[641px]:hidden'>
        <div className='space-y-3 px-3 pt-3'>
          {error ? (
            <div className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>{error}</div>
          ) : null}
          {isLoading ? <MobileOrderDetailsSkeleton /> : null}

          {!isLoading && order ? (
            <>
              <div className='flex items-start justify-between gap-2 px-1'>
                <div className='flex min-w-0 items-start gap-2'>
                  <Link
                    href='/UserBackend/orders'
                    className='mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9edf1] text-slate-700'
                    aria-label='Back to orders'
                  >
                    <span className='text-[11px] font-semibold'>ID</span>
                  </Link>
                  <div className='min-w-0'>
                    <p className='line-clamp-1 text-base font-semibold text-slate-900'>{order.orderNumber}</p>
                    <p className='text-sm text-slate-500'>{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                {showMobileReportIcon ? (
                  <button
                    type='button'
                    onClick={openReportSheet}
                    className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800'
                    aria-label='Report issue'
                  >
                    <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' aria-hidden='true'>
                      <path
                        fillRule='evenodd'
                        clipRule='evenodd'
                        d='M4 1C3.44772 1 3 1.44772 3 2V22C3 22.5523 3.44772 23 4 23C4.55228 23 5 22.5523 5 22V13.5983C5.46602 13.3663 6.20273 13.0429 6.99251 12.8455C8.40911 12.4914 9.54598 12.6221 10.168 13.555C11.329 15.2964 13.5462 15.4498 15.2526 15.2798C17.0533 15.1004 18.8348 14.5107 19.7354 14.1776C20.5267 13.885 21 13.1336 21 12.3408V5.72337C21 4.17197 19.3578 3.26624 18.0489 3.85981C16.9875 4.34118 15.5774 4.87875 14.3031 5.0563C12.9699 5.24207 12.1956 4.9907 11.832 4.44544C10.5201 2.47763 8.27558 2.24466 6.66694 2.37871C6.0494 2.43018 5.47559 2.53816 5 2.65249V2C5 1.44772 4.55228 1 4 1ZM5 4.72107V11.4047C5.44083 11.2247 5.95616 11.043 6.50747 10.9052C8.09087 10.5094 10.454 10.3787 11.832 12.4455C12.3106 13.1634 13.4135 13.4531 15.0543 13.2897C16.5758 13.1381 18.1422 12.6321 19 12.3172V5.72337C19 5.67794 18.9081 5.66623 18.875 5.68126C17.7575 6.18804 16.1396 6.81972 14.5791 7.03716C13.0776 7.24639 11.2104 7.1185 10.168 5.55488C9.47989 4.52284 8.2244 4.25586 6.83304 4.3718C6.12405 4.43089 5.46427 4.58626 5 4.72107Z'
                        fill='currentColor'
                      />
                    </svg>
                  </button>
                ) : null}
              </div>

              <article data-order-activity-card='true' className='rounded-xl border border-slate-200 bg-white p-3'>
                <div className='text-sm'>
                  <div className='flex items-center justify-between'>
                    <p className='text-slate-500'>Status:</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-slate-500'>{statusMessage}</p>
                </div>

                <div className='mt-1 space-y-1 text-sm'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-slate-500'>Seller:</p>
                    <p className='text-right font-medium text-sky-700'>{order.seller}</p>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-slate-500'>Track Id:</p>
                    <p className='text-right font-medium text-sky-700'>{order.trackId}</p>
                  </div>
                </div>

                <div className='mt-3 border-t border-slate-200 pt-3'>
                  <div className='flex items-start gap-2'>
                    <svg viewBox='0 0 32 32' className='mt-0.5 h-5 w-5 text-slate-500' fill='currentColor' aria-hidden='true'>
                      <path d='M 0 6 L 0 8 L 19 8 L 19 23 L 12.84375 23 C 12.398438 21.28125 10.851563 20 9 20 C 7.148438 20 5.601563 21.28125 5.15625 23 L 4 23 L 4 18 L 2 18 L 2 25 L 5.15625 25 C 5.601563 26.71875 7.148438 28 9 28 C 10.851563 28 12.398438 26.71875 12.84375 25 L 21.15625 25 C 21.601563 26.71875 23.148438 28 25 28 C 26.851563 28 28.398438 26.71875 28.84375 25 L 32 25 L 32 16.84375 L 31.9375 16.6875 L 29.9375 10.6875 L 29.71875 10 L 21 10 L 21 6 Z M 1 10 L 1 12 L 10 12 L 10 10 Z M 21 12 L 28.28125 12 L 30 17.125 L 30 23 L 28.84375 23 C 28.398438 21.28125 26.851563 20 25 20 C 23.148438 20 21.601563 21.28125 21.15625 23 L 21 23 Z M 2 14 L 2 16 L 8 16 L 8 14 Z M 9 22 C 10.117188 22 11 22.882813 11 24 C 11 25.117188 10.117188 26 9 26 C 7.882813 26 7 25.117188 7 24 C 7 22.882813 7.882813 22 9 22 Z M 25 22 C 26.117188 22 27 22.882813 27 24 C 27 25.117188 26.117188 26 25 26 C 23.882813 26 23 25.117188 23 24 C 23 22.882813 23.882813 22 25 22 Z' />
                    </svg>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Delivery Address</p>
                      <p className='mt-0.5 text-sm text-slate-700'>{order.addressLabel || 'Address not available'}</p>
                    </div>
                  </div>
                </div>

                <div className='mt-3 border-t border-slate-200 pt-3'>
                  <div className='flex items-start gap-2'>
                    <svg viewBox='0 0 24 24' className='mt-0.5 h-5 w-5 text-slate-500' fill='currentColor' aria-hidden='true'>
                      <path d='M20 15C20.5523 15 21 14.5523 21 14C21 13.4477 20.5523 13 20 13C19.4477 13 19 13.4477 19 14C19 14.5523 19.4477 15 20 15Z' />
                      <path
                        fillRule='evenodd'
                        clipRule='evenodd'
                        d='M16.775 0.985398C18.4919 0.460783 20.2821 1.55148 20.6033 3.3178L20.9362 5.14896C22.1346 5.54225 23 6.67006 23 8V10.7639C23.6137 11.3132 24 12.1115 24 13V15C24 15.8885 23.6137 16.6868 23 17.2361V20C23 21.6569 21.6569 23 20 23H4C2.34315 23 1 21.6569 1 20V8C1 6.51309 2.08174 5.27884 3.50118 5.04128L16.775 0.985398ZM21 16C21.5523 16 22 15.5523 22 15V13C22 12.4477 21.5523 12 21 12H18C17.4477 12 17 12.4477 17 13V15C17 15.5523 17.4477 16 18 16H21ZM21 18V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V8C3 7.44772 3.44772 7 4 7H20C20.55 7 20.9962 7.44396 21 7.99303L21 10H18C16.3431 10 15 11.3431 15 13V15C15 16.6569 16.3431 18 18 18H21ZM18.6954 3.60705L18.9412 5H10L17.4232 2.82301C17.9965 2.65104 18.5914 3.01769 18.6954 3.60705Z'
                      />
                    </svg>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Payment Mode</p>
                      <p className='mt-0.5 text-sm text-slate-700'>{order.paymentMode}</p>
                    </div>
                  </div>
                </div>

                <div className='mt-3 border-t border-slate-200 pt-3'>
                  <div className='flex items-start gap-2'>
                    <svg viewBox='0 0 20 20' className='mt-0.5 h-5 w-5 text-slate-500' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                      <path d='M3.5 6.5h13v7h-13z' />
                      <path d='M9.5 6.5V4.8a2.5 2.5 0 1 1 5 0v1.7' />
                    </svg>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Delivery method</p>
                      <p className='mt-0.5 text-sm text-slate-700'>{order.deliveryMethod || 'Standard delivery'}</p>
                    </div>
                  </div>
                </div>
              </article>

              <div>
                <p className='px-1 text-lg font-semibold text-slate-900'>Products In Order</p>
                <div className='mt-2 space-y-2'>
                  {(order.items || []).map((item) => (
                    <article key={item.id} className='rounded-xl border border-slate-200 bg-white p-3'>
                      <div className='grid grid-cols-[96px_minmax(0,1fr)_auto] gap-x-2.5 gap-y-2'>
                        <div className='relative h-24 w-24 overflow-hidden rounded-md border border-slate-200 bg-slate-100'>
                          {item.image ? (
                            <Image src={item.image} alt={item.name || 'Product'} fill sizes='96px' className='object-cover' />
                          ) : null}
                        </div>
                        <div className='min-w-0'>
                          <p className='line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500'>
                            {item.vendor || 'OCPRIMES'}
                          </p>
                          <p className='line-clamp-2 text-sm font-semibold text-slate-900'>{item.name}</p>
                          {item.variation ? <p className='text-xs text-slate-500'>{item.variation}</p> : null}
                          <p className='text-xs text-slate-500'>Qty {item.quantity}</p>
                          {item.isProtectionCovered ? (
                            <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${protectionBadgeTone}`}>
                              <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
                                <path fillRule='evenodd' clipRule='evenodd' d='M12.4472 1.10557C12.1657 0.964809 11.8343 0.964809 11.5528 1.10557L3.55279 5.10557C3.214 5.27496 3 5.62123 3 6V12C3 14.6622 3.86054 16.8913 5.40294 18.7161C6.92926 20.5218 9.08471 21.8878 11.6214 22.9255C11.864 23.0248 12.136 23.0248 12.3786 22.9255C14.9153 21.8878 17.0707 20.5218 18.5971 18.7161C20.1395 16.8913 21 14.6622 21 12V6C21 5.62123 20.786 5.27496 20.4472 5.10557L12.4472 1.10557ZM5 12V6.61803L12 3.11803L19 6.61803V12C19 14.1925 18.305 15.9635 17.0696 17.425C15.8861 18.8252 14.1721 19.9803 12 20.9156C9.82786 19.9803 8.11391 18.8252 6.93039 17.425C5.69502 15.9635 5 14.1925 5 12ZM16.7572 9.65323C17.1179 9.23507 17.0714 8.60361 16.6532 8.24284C16.2351 7.88207 15.6036 7.9286 15.2428 8.34677L10.7627 13.5396L8.70022 11.5168C8.30592 11.1301 7.67279 11.1362 7.28607 11.5305C6.89935 11.9248 6.90549 12.5579 7.29978 12.9446L10.1233 15.7139C10.3206 15.9074 10.5891 16.0106 10.8651 15.9991C11.1412 15.9876 11.4002 15.8624 11.5807 15.6532L16.7572 9.65323Z' fill='currentColor'></path>
                              </svg>
                              <span>{protectionBadgeLabel}</span>
                            </p>
                          ) : null}
                        </div>
                        <div className='self-start text-right'>
                          <p className='text-sm font-semibold text-slate-900'>{formatMoney(item.lineTotal)}</p>
                        </div>
                        <div className='col-span-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-2'>
                          {item.isReturnable || item.isProtectionCovered ? (
                            <button
                              type='button'
                              onClick={() => handleRequestReturn(item)}
                              className='inline-flex text-xs font-semibold text-slate-700 underline underline-offset-2'
                            >
                              {item.isReturnEligible ? 'Return' : 'Returnable'}
                            </button>
                          ) : (
                            <span className='inline-flex text-xs font-semibold text-slate-400'>
                              Not returnable
                            </span>
                          )}
                          {canReviewOrder ? (
                            <Link
                              href={getItemReviewHref(item)}
                              className='inline-flex text-xs font-semibold text-slate-700 underline underline-offset-2'
                            >
                              Add review
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className='fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 backdrop-blur min-[641px]:hidden'>
        <div className='flex w-full gap-2'>
          <button
            type='button'
            onClick={handlePrimaryAction}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#1d4ed8] text-sm font-semibold text-white'
          >
            {primaryActionLabel}
          </button>
          <button
            type='button'
            onClick={
              canCancelOrder
                ? handleCancelOrder
                : isDeliveredOrder
                  ? handleReorderOrder
                  : openReportSheet
            }
            disabled={(canCancelOrder && isCancellingOrder) || (isDeliveredOrder && isReorderingOrder)}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {canCancelOrder
              ? isCancellingOrder
                ? 'Cancelling...'
                : 'Cancel order'
              : isDeliveredOrder
                ? isReorderingOrder
                  ? 'Re-ordering...'
                  : 'Re-order'
                : 'Report'}
          </button>
        </div>
      </div>

      {isReturnSheetOpen ? (
        <div className='fixed inset-0 z-40 bg-black/35' onClick={closeReturnSheet}>
          <div
            className='absolute inset-x-0 bottom-0 top-[4.25rem] flex flex-col overflow-hidden rounded-t-2xl bg-white min-[641px]:bottom-auto min-[641px]:left-1/2 min-[641px]:top-1/2 min-[641px]:h-auto min-[641px]:w-full min-[641px]:max-h-[min(90svh,44rem)] min-[641px]:max-w-xl min-[641px]:-translate-x-1/2 min-[641px]:-translate-y-1/2 min-[641px]:rounded-2xl'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3'>
              <div>
                <h2 className='text-lg font-semibold text-slate-900'>Return products</h2>
                <p className='text-xs text-slate-500'>Select an item and tell us why you want to return it.</p>
              </div>
              <button
                type='button'
                onClick={closeReturnSheet}
                className='inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100'
                aria-label='Close return menu'
              >
                <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M5 5l10 10M15 5 5 15' strokeLinecap='round' />
                </svg>
              </button>
            </div>
            <div className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 min-[641px]:pb-5'>
              {protectionEligibleItems.length > 0 ? (
                <section className='space-y-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.05em] text-emerald-700'>
                    Order protection (24 hours)
                  </p>
                  {protectionEligibleItems.map((item) =>
                    renderReturnItemSelection({
                      item,
                      keyPrefix: 'protection',
                      selectedClassName: 'border-emerald-500 bg-emerald-50',
                      unselectedClassName: 'border-emerald-200 bg-emerald-50/40',
                      accentClassName: 'accent-emerald-700',
                      coverageText: item.isReturnPolicyEligible
                        ? 'Covered by order protection and return policy.'
                        : 'Covered by order protection.',
                    }),
                  )}
                </section>
              ) : null}

              {returnPolicyOnlyItems.length > 0 ? (
                <section className='space-y-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.05em] text-sky-700'>
                    Return policy (3 days)
                  </p>
                  {returnPolicyOnlyItems.map((item) =>
                    renderReturnItemSelection({
                      item,
                      keyPrefix: 'return-policy',
                      selectedClassName: 'border-slate-900 bg-slate-50',
                      unselectedClassName: 'border-slate-200 bg-white',
                      accentClassName: 'accent-slate-900',
                      coverageText: 'Eligible under standard return policy.',
                    }),
                  )}
                </section>
              ) : null}

              {notReturnableItems.length > 0 ? (
                <section className='space-y-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.05em] text-amber-700'>
                    Not currently returnable
                  </p>
                  {notReturnableItems.map((item) => (
                    <article key={`not-returnable-${item.id}`} className='rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5'>
                      <p className='text-sm font-semibold text-slate-900'>{item.name}</p>
                      <p className='mt-0.5 text-xs text-slate-600'>{getReturnBlockedReason(item)}</p>
                    </article>
                  ))}
                </section>
              ) : null}

              {returnEligibleItems.length === 0 && notReturnableItems.length === 0 ? (
                <p className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600'>
                  No products are currently eligible for return.
                </p>
              ) : null}

              {returnEligibleItems.length > 0 ? (
                <section className='space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3'>
                  <p className='text-xs font-semibold uppercase tracking-[0.05em] text-slate-600'>
                    Add image/video
                  </p>
                  <div className='space-y-1.5'>
                    <label className='inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                      Choose files
                      <input
                        ref={returnMediaInputRef}
                        type='file'
                        accept='image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime'
                        multiple
                        onChange={handleReturnMediaChange}
                        className='sr-only'
                      />
                    </label>
                    <p className='text-xs text-slate-500'>
                      Up to {MAX_RETURN_MEDIA_FILES} files (JPEG, PNG, WEBP, MP4, WEBM, MOV).
                    </p>
                    {returnMediaFiles.length > 0 ? (
                      <div className='space-y-1.5'>
                        {returnMediaFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                            className='flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2'
                          >
                            <p className='min-w-0 truncate text-xs text-slate-700'>{file.name}</p>
                            <button
                              type='button'
                              onClick={() => handleRemoveReturnMedia(index)}
                              className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100'
                              aria-label='Remove file'
                            >
                              <svg viewBox='0 0 20 20' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='2'>
                                <path d='M5 5l10 10M15 5 5 15' strokeLinecap='round' />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
            <div className='shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3'>
              <button
                type='button'
                onClick={handleSubmitReturnRequest}
                disabled={!canSubmitReturnRequest}
                className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[#b16a3d] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(177,106,61,0.28)] disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isSendingReturnRequest ? 'Sending...' : 'Send return request'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isReportSheetOpen ? (
        <div className='fixed inset-0 z-40 bg-black/35' onClick={() => setIsReportSheetOpen(false)}>
          <div
            className='absolute inset-x-0 bottom-0 overflow-hidden rounded-t-2xl bg-white min-[641px]:bottom-auto min-[641px]:left-1/2 min-[641px]:top-1/2 min-[641px]:w-full min-[641px]:max-w-md min-[641px]:-translate-x-1/2 min-[641px]:-translate-y-1/2 min-[641px]:rounded-2xl'
            style={
              isReportSheetDragging || reportSheetDragY > 0
                ? {
                    transform: `translateY(${reportSheetDragY}px)`,
                    transition: isReportSheetDragging ? 'none' : 'transform 180ms ease',
                  }
                : undefined
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className='flex max-h-[calc(100dvh-4.25rem)] flex-col min-[641px]:max-h-[min(80dvh,42rem)]'>
              <div
                className='shrink-0 flex items-center justify-center border-b border-slate-200 bg-white px-4 py-1.5 touch-none shadow-[0_6px_14px_rgba(15,23,42,0.06)] min-[641px]:hidden'
                onPointerDown={handleReportSheetDragStart}
                onPointerMove={handleReportSheetDragMove}
                onPointerUp={handleReportSheetDragEnd}
                onPointerCancel={handleReportSheetDragEnd}
              >
                <button
                  type='button'
                  onClick={() => setIsReportSheetOpen(false)}
                  className='inline-flex h-6 w-20 items-center justify-center'
                  aria-label='Close report menu'
                >
                  <span className='h-1.5 w-16 rounded-full bg-slate-300' />
                </button>
              </div>

              <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 min-[641px]:px-5 min-[641px]:pb-5 min-[641px]:pt-5'>
                <h2 className='text-2xl font-semibold text-slate-900'>Report issue</h2>
                <p className='mt-1 text-sm text-slate-500'>Select what happened and send it directly to Help Center.</p>

                <div className='mt-3 space-y-2'>
                  {availableReportReasonOptions.map((option) => (
                    <label
                      key={option.key}
                      className={`block cursor-pointer rounded-xl border px-3 py-2.5 transition ${
                        selectedReportReason === option.key
                          ? 'border-[#b16a3d] bg-[#b16a3d]/5'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className='flex items-start gap-2'>
                        <input
                          type='radio'
                          name='report-reason'
                          checked={selectedReportReason === option.key}
                          onChange={() => setSelectedReportReason(option.key)}
                          className='mt-0.5 accent-[#b16a3d]'
                        />
                        <span className='min-w-0'>
                          <span className='block text-sm font-medium text-slate-800'>{option.label}</span>
                          <span className='mt-0.5 block text-xs text-slate-500'>{option.detail}</span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className='shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_rgba(15,23,42,0.12)] min-[641px]:hidden'>
                <button
                  type='button'
                  onClick={handleSendReport}
                  className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[#b16a3d] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(177,106,61,0.28)]'
                >
                  Send to Help Center
                </button>
              </div>

              <div className='hidden shrink-0 border-t border-slate-200 bg-white px-5 py-4 min-[641px]:block'>
                <button
                  type='button'
                  onClick={handleSendReport}
                  className='inline-flex h-11 w-full items-center justify-center rounded-md bg-[#b16a3d] text-sm font-semibold text-white'
                >
                  Send to Help Center
                </button>
                <button
                  type='button'
                  onClick={() => setIsReportSheetOpen(false)}
                  className='mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-700'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isMobileActivitySheetOpen ? (
        <div
          className='fixed inset-0 z-40 bg-black/35 min-[641px]:hidden'
          onClick={() => setIsMobileActivitySheetOpen(false)}
        >
          <div
            className='absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-4.25rem)] flex-col overflow-hidden rounded-t-2xl bg-white'
            style={
              isMobileActivitySheetDragging || mobileActivitySheetDragY > 0
                ? {
                    transform: `translateY(${mobileActivitySheetDragY}px)`,
                    transition: isMobileActivitySheetDragging ? 'none' : 'transform 180ms ease',
                  }
                : undefined
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className='shrink-0 border-b border-slate-200 px-4 pb-2 pt-1.5 touch-none'
              onPointerDown={handleMobileActivityDragStart}
              onPointerMove={handleMobileActivityDragMove}
              onPointerUp={handleMobileActivityDragEnd}
              onPointerCancel={handleMobileActivityDragEnd}
            >
              <button
                type='button'
                onClick={() => setIsMobileActivitySheetOpen(false)}
                className='mx-auto mb-2 inline-flex h-6 w-full items-center justify-center'
                aria-label='Close order activity'
              >
                <span className='h-1.5 w-16 rounded-full bg-slate-300' />
              </button>
              <p className='text-sm font-semibold text-slate-900'>Order Activity</p>
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto px-4 py-3'>
              {trackingActivity.terminalMessage ? (
                <div className='mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700'>
                  {trackingActivity.terminalMessage}
                </div>
              ) : null}
              {trackingSteps.map((step, index) => (
                <div key={`mobile-activity-${step.label}-${index}`} className='relative pl-6'>
                  {index < trackingSteps.length - 1 ? (
                    <span
                      className={`absolute left-[7px] top-4 h-[calc(100%-4px)] w-[2.5px] rounded-full ${
                        step.isActive && trackingSteps[index + 1]?.isActive ? 'bg-sky-400' : 'bg-slate-300'
                      }`}
                      aria-hidden='true'
                    />
                  ) : null}
                  <span
                    className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 ${
                      step.isActive ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'
                    }`}
                    aria-hidden='true'
                  />
                  <div className='pb-5'>
                    <p className={`text-sm font-semibold ${step.isActive ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
                    <p className='text-xs text-slate-500'>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
