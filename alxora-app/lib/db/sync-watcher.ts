import { Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { runSync, pullProducts } from './sync'

let isSyncing = false

async function syncNow(): Promise<void> {
  if (isSyncing) return
  isSyncing = true
  try {
    const result = await runSync()
    if (result.succeeded > 0) {
      await pullProducts()
    }
  } catch {
    // Non-fatal: stays queued, retried on the next connectivity change.
  } finally {
    isSyncing = false
  }
}

// Starts listening for connectivity changes and replays the offline queue
// whenever the device transitions from offline to online. Call once near
// app startup (after sign-in). Returns an unsubscribe function.
export function startSyncWatcher(): () => void {
  // Also attempt a sync immediately on start, in case there's already a
  // pending queue from a previous session that never got a chance to sync.
  void syncNow()

  // @react-native-community/netinfo's web implementation races a fetch
  // against a timeout using an AbortController and throws an unhandled
  // "aborted without reason" rejection in some browsers — noisy but
  // harmless. Native (iOS/Android), the real target, doesn't hit this.
  // The browser's own online/offline events cover the same need on web.
  if (Platform.OS === 'web') {
    const handleOnline = () => void syncNow()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }

  let wasConnected = true
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false)
    if (isConnected && !wasConnected) {
      void syncNow()
    }
    wasConnected = isConnected
  })

  return unsubscribe
}

export { syncNow }
