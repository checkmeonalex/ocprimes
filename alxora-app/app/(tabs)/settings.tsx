import { useCallback, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { countPendingSync } from '../../lib/db/products'
import { syncNow } from '../../lib/db/sync-watcher'

export default function SettingsScreen() {
  const { session, signOut } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void countPendingSync().then(setPendingCount)
    }, []),
  )

  const handleSyncNow = async () => {
    setIsSyncing(true)
    await syncNow()
    setPendingCount(await countPendingSync())
    setIsSyncing(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{session?.user?.email || '—'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Pending changes</Text>
        <Text style={styles.value}>{pendingCount}</Text>
        <Pressable style={styles.syncButton} onPress={handleSyncNow} disabled={isSyncing}>
          <Text style={styles.syncText}>{isSyncing ? 'Syncing…' : 'Sync now'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 70 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 20 },
  card: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 12,
  },
  label: { color: '#8a8a8e', fontSize: 12, fontWeight: '600' },
  value: { color: '#fff', fontSize: 15, marginTop: 4 },
  syncButton: {
    marginTop: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  signOutButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: '#ff6b6b', fontWeight: '700', fontSize: 15 },
})
