import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { startSyncWatcher } from '../lib/db/sync-watcher'

function RootNavigation() {
  const { session, isLoading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/products')
    }
  }, [session, isLoading, segments])

  useEffect(() => {
    if (!session) return undefined
    const unsubscribe = startSyncWatcher()
    return unsubscribe
  }, [session])

  if (isLoading) return null

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigation />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
