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
  let wasConnected = true

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false)
    if (isConnected && !wasConnected) {
      void syncNow()
    }
    wasConnected = isConnected
  })

  // Also attempt a sync immediately on start, in case there's already a
  // pending queue from a previous session that never got a chance to sync.
  void syncNow()

  return unsubscribe
}

export { syncNow }
