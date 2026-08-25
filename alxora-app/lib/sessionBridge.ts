// Bridges the WebView's real browser session (the SAME @supabase/ssr
// client the web app already uses, storing its session in localStorage
// under a deterministic key — see src/lib/supabase/browser.ts on the web)
// into a native Supabase client, so the native offline-sync code can call
// /api/admin/products with a real access token without a second visible
// login screen. No changes to the web app needed — this only reads a
// public, stable Supabase Auth storage key via injected JS.

const projectRef = (() => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
  const match = /^https:\/\/([^.]+)\./.exec(url)
  return match ? match[1] : ''
})()

const STORAGE_KEY = `sb-${projectRef}-auth-token`

// Injected once per WebView load. Polls localStorage for the session key
// (cheap, short interval) and posts it to React Native whenever it
// changes — covers both the initial page load (session already present
// from a prior WebView session) and a fresh sign-in happening live.
export const SESSION_BRIDGE_SCRIPT = `
(function () {
  var STORAGE_KEY = ${JSON.stringify(STORAGE_KEY)};
  var lastValue = null;
  function post(value) {
    if (value === lastValue) return;
    lastValue = value;
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'supabase-session',
        raw: value,
      }));
    } catch (e) {}
  }
  function check() {
    try {
      post(window.localStorage.getItem(STORAGE_KEY));
    } catch (e) {}
  }
  check();
  setInterval(check, 2000);
})();
true;
`

export type BridgedSession = {
  access_token: string
  refresh_token: string
} | null

// Parses the raw localStorage value the injected script forwards. The
// @supabase/ssr browser client stores either the full session object
// directly, or (older/edge format) an array [access_token, refresh_token,
// ...] — handle both defensively since this is reading an internal
// storage shape, not a documented API contract.
export function parseBridgedSession(raw: string | null): BridgedSession {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.access_token && parsed?.refresh_token) {
      return { access_token: parsed.access_token, refresh_token: parsed.refresh_token }
    }
    if (Array.isArray(parsed) && parsed[0] && parsed[1]) {
      return { access_token: parsed[0], refresh_token: parsed[1] }
    }
    return null
  } catch {
    return null
  }
}
