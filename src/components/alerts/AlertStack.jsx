'use client'

import { useAlerts } from '@/context/AlertContext'
import { usePathname } from 'next/navigation'
import { Check, X, AlertTriangle, Info, XCircle } from 'lucide-react'

const typeStyles = {
  success: 'ios-alert--success',
  error: 'ios-alert--error',
  warning: 'ios-alert--warning',
  info: 'ios-alert--info',
}

const iconWrapStyles = {
  success: 'bg-emerald-500/12 text-emerald-600',
  error: 'bg-rose-500/12 text-rose-600',
  warning: 'bg-amber-500/12 text-amber-600',
  info: 'bg-slate-500/12 text-slate-600',
}

const icons = {
  success: Check,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const AlertIcon = ({ type }) => {
  const Icon = icons[type] || icons.info
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconWrapStyles[type] || iconWrapStyles.info}`}>
      <Icon size={14} strokeWidth={2.5} />
    </span>
  )
}

export default function AlertStack() {
  const { alerts, confirmations, removeAlert, resolveConfirm } = useAlerts()
  const pathname = usePathname()
  const isUserBackendRoute = pathname?.startsWith('/UserBackend')

  if (!alerts.length && !confirmations.length) return null

  return (
    <div
      className={`fixed left-1/2 z-[20000] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 ${
        isUserBackendRoute
          ? 'top-[calc(env(safe-area-inset-top)+4rem)] lg:top-3'
          : 'top-3'
      }`}
    >
      {confirmations.map((item) => (
        <div
          key={item.id}
          className={`alert-slide-in ios-alert-card rounded-2xl px-3.5 py-3 ${typeStyles[item.type] || typeStyles.warning}`}
          role='alertdialog'
          aria-live='assertive'
        >
          <div className='flex items-start gap-2.5'>
            <AlertIcon type={item.type} />
            <div className='min-w-0 flex-1 pt-0.5'>
              {item.title ? <p className='text-[13px] font-semibold leading-4 text-slate-900'>{item.title}</p> : null}
              {item.message ? <p className='mt-0.5 text-[12px] leading-4 text-slate-500'>{item.message}</p> : null}
              <div className='mt-2.5 flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => resolveConfirm(item.id, true)}
                  className='ios-alert-action ios-alert-action--primary rounded-full px-3 py-1 text-[11px] font-semibold'
                >
                  {item.confirmLabel || 'Allow'}
                </button>
                <button
                  type='button'
                  onClick={() => resolveConfirm(item.id, false)}
                  className='ios-alert-action rounded-full px-3 py-1 text-[11px] font-semibold'
                >
                  {item.cancelLabel || 'Deny'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`alert-slide-in ios-alert-card relative overflow-hidden rounded-2xl py-3 pl-3.5 pr-9 ${typeStyles[alert.type] || typeStyles.info}`}
          role='status'
        >
          <div className='flex items-start gap-2.5'>
            <AlertIcon type={alert.type} />
            <div className='min-w-0 flex-1 pt-0.5'>
              {alert.title ? (
                <p className='truncate text-[13px] font-semibold leading-4 text-slate-900'>{alert.title}</p>
              ) : null}
              {alert.message ? (
                <p className='mt-0.5 text-[12px] leading-4 text-slate-500'>{alert.message}</p>
              ) : null}
              {alert.actionLabel ? (
                <button
                  type='button'
                  onClick={() => {
                    const handler = alert.onAction
                    removeAlert(alert.id)
                    if (typeof handler === 'function') {
                      try {
                        handler()
                      } catch {
                        // ignore alert action handler errors
                      }
                    }
                  }}
                  className='mt-2 inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800'
                >
                  {alert.actionLabel}
                </button>
              ) : null}
            </div>
          </div>
          <button
            type='button'
            onClick={() => removeAlert(alert.id)}
            className='absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-black/5 hover:text-slate-600'
            aria-label='Dismiss alert'
          >
            <X size={13} strokeWidth={2.5} />
          </button>
          {alert.timeoutMs > 0 && (
            <span
              className='ios-alert-progress absolute inset-x-0 bottom-0 h-[2px] origin-left bg-current opacity-25'
              style={{ animationDuration: `${alert.timeoutMs}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
