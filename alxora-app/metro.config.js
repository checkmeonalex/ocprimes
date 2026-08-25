const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// expo-sqlite ships a WASM build for the web target (SQLite compiled via
// wa-sqlite) — Metro needs to know how to resolve .wasm imports, which
// isn't enabled by default. Native (iOS/Android) doesn't need this; it
// uses the real on-device SQLite library instead.
config.resolver.assetExts.push('wasm')
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'wasm')

config.server = config.server || {}
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    // wa-sqlite needs SharedArrayBuffer, which requires these headers.
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    return middleware(req, res, next)
  }
}

module.exports = config
