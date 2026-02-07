'use client'

import { useAlerts } from '@/context/AlertContext'

const typeStyles = {
  success: 'ios-alert--success',
  error: 'ios-alert--error',
  warning: 'ios-alert--warning',
  info: 'ios-alert--info',
}

const dotStyles = {
  success: 'bg-emerald-500/90',
  error: 'bg-rose-500/90',
  warning: 'bg-amber-500/90',
  info: 'bg-slate-500/90',
}

export default function AlertStack() {
  const { alerts, confirmations, removeAlert, resolveConfirm } = useAlerts()

  if (!alerts.length && !confirmations.length) return null

  return (
    <div className='fixed top-3 left-1/2 z-[100] flex w-[min(94vw,420px)] -translate-x-1/2 flex-col gap-2.5'>
      {confirmations.map((item) => (
        <div
          key={item.id}
          className={`alert-slide-in ios-alert-card rounded-[18px] border px-4 py-3 ${typeStyles[item.type] || typeStyles.warning}`}
          role='alertdialog'
          aria-live='assertive'
        >
          <div className='flex items-start gap-3'>
            <span className={`mt-1 h-2 w-2 rounded-full ${dotStyles[item.type] || dotStyles.warning}`} />
            <div className='flex-1'>
              {item.title ? <p className='text-[14px] font-semibold leading-5 text-slate-900'>{item.title}</p> : null}
              {item.message ? <p className='mt-0.5 text-[12px] leading-4 text-slate-600'>{item.message}</p> : null}
              <div className='mt-3 flex items-center gap-2 border-t border-slate-200/80 pt-2.5'>
                <button
                  type='button'
                  onClick={() => resolveConfirm(item.id, true)}
                  className='ios-alert-action ios-alert-action--primary rounded-full px-3.5 py-1.5 text-[12px] font-semibold'
                >
                  {item.confirmLabel || 'Allow'}
                </button>
                <button
                  type='button'
                  onClick={() => resolveConfirm(item.id, false)}
                  className='ios-alert-action rounded-full px-3.5 py-1.5 text-[12px] font-semibold'
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
          className={`alert-slide-in ios-alert-card rounded-[18px] border px-4 py-3 ${typeStyles[alert.type] || typeStyles.info}`}
          role='status'
        >
          <div className='flex items-start gap-3'>
            <span className={`mt-1 h-2 w-2 rounded-full ${dotStyles[alert.type] || dotStyles.info}`} />
            <div className='flex-1'>
              {alert.title ? (
                <p className='text-[14px] font-semibold leading-5 text-slate-900'>{alert.title}</p>
              ) : null}
              {alert.message ? (
                <p className='mt-0.5 text-[12px] leading-4 text-slate-600'>{alert.message}</p>
              ) : null}
            </div>
            <button
              type='button'
              onClick={() => removeAlert(alert.id)}
              className='rounded-full border border-transparent p-1 text-[11px] font-semibold text-slate-500 hover:border-slate-300 hover:bg-white/70 hover:text-slate-700'
              aria-label='Dismiss alert'
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
