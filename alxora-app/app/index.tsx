import { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Platform, BackHandler, Pressable, Text } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WebViewNavigation, WebViewMessageEvent } from 'react-native-webview'
import { supabase } from '../lib/supabase'
import { SESSION_BRIDGE_SCRIPT, parseBridgedSession } from '../lib/sessionBridge'
import { apiRequest } from '../lib/api'

const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')
const LAST_URL_KEY = 'alxora-last-url'
const DASHBOARD_URL = `${baseUrl}/backend/admin/dashboard`
const DASHBOARD_PATH_PREFIXES = ['/backend/admin', '/admin']

const isDashboardUrl = (url: string) => {
  try {
    const path = new URL(url).pathname
    return DASHBOARD_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  } catch {
    return false
  }
}

// The whole app IS the real site, loaded live in a WebView — same code the
// browser gets (login, dashboard, products, storefront, everything),
// always in sync with the web with zero duplicated UI. The only native
// screen is the offline product editor (app/offline-products.tsx),
// reached automatically when the WebView fails to load because the
// device has no connection — a WebView fundamentally can't create/edit
// products offline since it just talks straight to the server.
//
// The app resumes wherever the user last was (like a browser tab), not a
// fixed login/home screen — the WebView starts from the last visited URL,
// persisted across app restarts. A signed-in customer sees nothing extra;
// a signed-in vendor gets a "Manage store" shortcut into the dashboard.
export default function WebShell() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const webviewRef = useRef<any>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [startUrl, setStartUrl] = useState<string | null>(null)
  const [isVendor, setIsVendor] = useState(false)
  const [isInDashboard, setIsInDashboard] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(LAST_URL_KEY).then((stored) => {
      const resolved = stored && stored.startsWith(baseUrl) ? stored : baseUrl
      setStartUrl(resolved)
      setIsInDashboard(isDashboardUrl(resolved))
    })
  }, [])

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack)
    if (navState.url && navState.url.startsWith(baseUrl)) {
      void AsyncStorage.setItem(LAST_URL_KEY, navState.url)
      setIsInDashboard(isDashboardUrl(navState.url))
    }
  }, [])

  const handleLoadError = useCallback(() => {
    router.replace('/offline-products')
  }, [router])

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    let payload: any
    try {
      payload = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }
    if (payload?.type !== 'supabase-session') return

    const session = parseBridgedSession(payload.raw)
    if (session) {
      supabase.auth.setSession(session).then(() => {
        apiRequest<{ is_vendor?: boolean }>('/api/auth/role')
          .then((role) => setIsVendor(Boolean(role?.is_vendor)))
          .catch(() => setIsVendor(false))
      })
    } else {
      void supabase.auth.signOut()
      setIsVendor(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webviewRef.current) {
          webviewRef.current.goBack()
          return true
        }
        return false
      })
      return () => subscription.remove()
    }, [canGoBack]),
  )

  const navigateWebview = (url: string) => {
    webviewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`)
  }

  // Deferred import: react-native-webview is native-only.
  const { WebView } = require('react-native-webview')

  if (!startUrl) return null

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <WebView
        ref={webviewRef}
        source={{ uri: startUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleLoadError}
        onMessage={handleMessage}
        injectedJavaScript={SESSION_BRIDGE_SCRIPT}
        pullToRefreshEnabled
        sharedCookiesEnabled
        startInLoadingState
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />

      {isVendor ? (
        <Pressable
          style={[styles.manageButton, { bottom: insets.bottom + 16 }]}
          onPress={() => navigateWebview(isInDashboard ? baseUrl : DASHBOARD_URL)}
        >
          <Text style={styles.manageButtonText}>{isInDashboard ? 'Back to site' : 'Manage store'}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  webview: { flex: 1 },
  manageButton: {
    position: 'absolute',
    right: 16,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  manageButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
