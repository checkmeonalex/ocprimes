import { useCallback, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Image } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { listLocalProducts, type LocalProduct, countPendingSync } from '../../../lib/db/products'
import { syncNow } from '../../../lib/db/sync-watcher'
import { pullProducts } from '../../../lib/db/sync'

export default function ProductsScreen() {
  const router = useRouter()
  const [products, setProducts] = useState<LocalProduct[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadFromCache = useCallback(async () => {
    const [items, pending] = await Promise.all([listLocalProducts(), countPendingSync()])
    setProducts(items)
    setPendingCount(pending)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadFromCache()
    }, [loadFromCache]),
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await syncNow()
      await pullProducts()
    } catch {
      // Offline or request failed — local cache is still shown as-is.
    }
    await loadFromCache()
    setIsRefreshing(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/(tabs)/products/new')}>
          <Ionicons name="add" size={22} color="#000" />
        </Pressable>
      </View>

      {pendingCount > 0 ? (
        <View style={styles.pendingBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#f5d10b" />
          <Text style={styles.pendingText}>
            {pendingCount} change{pendingCount === 1 ? '' : 's'} waiting to sync
          </Text>
        </View>
      ) : null}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#fff" />}
        renderItem={({ item }) => {
          const title = String(item.data.title || item.data.name || 'Untitled')
          const image = (item.data.images as any)?.[0]?.src || (item.data as any).thumbnail
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item.id } })}
            >
              <View style={styles.thumb}>
                {image ? <Image source={{ uri: image }} style={styles.thumbImage} /> : null}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {title}
                </Text>
                {item.is_dirty ? <Text style={styles.dirtyBadge}>Not synced</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#5a5a5e" />
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products yet.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  addButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(245,209,11,0.1)',
  },
  pendingText: { color: '#f5d10b', fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  thumb: {
    height: 44,
    width: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  thumbImage: { height: '100%', width: '100%' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dirtyBadge: { color: '#f5d10b', fontSize: 11, marginTop: 2 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { color: '#6a6a6e', fontSize: 14 },
})
