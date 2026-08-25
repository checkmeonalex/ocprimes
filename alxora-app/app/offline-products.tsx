import { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  listLocalProducts,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
  countPendingSync,
  type LocalProduct,
} from '../lib/db/products'
import { syncNow } from '../lib/db/sync-watcher'

// Reached automatically when the WebView (the real site) fails to load
// because the device has no connection — the one thing a live WebView
// fundamentally can't do offline. Lets a vendor keep creating/editing
// their own products locally; everything queues in SQLite and syncs to
// the real server automatically once back online (see lib/db/sync.ts).
export default function OfflineProductsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [products, setProducts] = useState<LocalProduct[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftPrice, setDraftPrice] = useState('')
  const [isRetrying, setIsRetrying] = useState(false)

  const load = useCallback(async () => {
    const [items, pending] = await Promise.all([listLocalProducts(), countPendingSync()])
    setProducts(items)
    setPendingCount(pending)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const handleRetryConnection = async () => {
    setIsRetrying(true)
    await syncNow().catch(() => {})
    setIsRetrying(false)
    router.replace('/')
  }

  const openNewDraft = () => {
    setEditingId('__new__')
    setDraftTitle('')
    setDraftPrice('')
  }

  const openEditDraft = (product: LocalProduct) => {
    setEditingId(product.id)
    setDraftTitle(String(product.data.title || ''))
    setDraftPrice(String(product.data.price ?? ''))
  }

  const closeDraft = () => setEditingId(null)

  const handleSaveDraft = async () => {
    if (!draftTitle.trim()) return
    const payload = {
      title: draftTitle.trim(),
      price: draftPrice ? Number(draftPrice) : undefined,
    }
    if (editingId === '__new__') {
      await createLocalProduct(payload)
    } else if (editingId) {
      await updateLocalProduct(editingId, payload)
    }
    closeDraft()
    await load()
  }

  const handleDelete = (product: LocalProduct) => {
    Alert.alert('Delete product?', 'This will be removed once synced.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteLocalProduct(product.id)
          await load()
        },
      },
    ])
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Offline</Text>
          <Text style={styles.subtitle}>No connection — changes save on your device</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openNewDraft}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {pendingCount > 0 ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>
            {pendingCount} change{pendingCount === 1 ? '' : 's'} waiting to sync
          </Text>
        </View>
      ) : null}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const title = String(item.data.title || item.data.name || 'Untitled')
          return (
            <Pressable style={styles.row} onPress={() => openEditDraft(item)}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {title}
                </Text>
                {item.is_dirty ? <Text style={styles.dirtyBadge}>Not synced</Text> : null}
              </View>
              <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products saved on this device yet.</Text>
          </View>
        }
      />

      <Pressable
        style={[styles.retryButton, { marginBottom: Math.max(insets.bottom, 16) }]}
        onPress={handleRetryConnection}
        disabled={isRetrying}
      >
        <Text style={styles.retryText}>{isRetrying ? 'Checking…' : 'Back online? Reconnect'}</Text>
      </Pressable>

      <Modal visible={editingId !== null} animationType="slide" onRequestClose={closeDraft}>
        <ScrollView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          contentContainerStyle={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <Text style={styles.modalTitle}>{editingId === '__new__' ? 'New product' : 'Edit product'}</Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={draftTitle}
            onChangeText={setDraftTitle}
            placeholder="Product name"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Price</Text>
          <TextInput
            style={styles.input}
            value={draftPrice}
            onChangeText={setDraftPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
          />

          <Pressable style={styles.saveButton} onPress={handleSaveDraft} disabled={!draftTitle.trim()}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={closeDraft}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 20, fontWeight: '600', marginTop: -2 },
  pendingBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingText: { color: '#b45309', fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  rowText: { flex: 1, minWidth: 0, marginRight: 12 },
  rowTitle: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
  dirtyBadge: { color: '#b45309', fontSize: 11, marginTop: 2, fontWeight: '600' },
  deleteText: { color: '#e11d48', fontSize: 13, fontWeight: '600' },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  modalContent: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  label: { color: '#64748b', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    color: '#0f172a',
    fontSize: 15,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 10 },
  cancelButtonText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
})
