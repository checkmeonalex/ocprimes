import { WebView } from 'react-native-webview'
import { View, StyleSheet } from 'react-native'

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || ''

// Opens the live Alxora storefront exactly as a browser would — same
// site, same data, just wrapped in the installed app instead of a browser
// tab, per the "can also open the main store, just like visiting the web
// app" requirement.
export default function StoreScreen() {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: baseUrl }} style={styles.webview} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
})
