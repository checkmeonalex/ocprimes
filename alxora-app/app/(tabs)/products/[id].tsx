import { useCallback, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { getLocalProduct, updateLocalProduct, deleteLocalProduct } from '../../../lib/db/products'

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let active = true
      getLocalProduct(id).then((product) => {
        if (!active || !product) return
        setTitle(String(product.data.title || ''))
        setPrice(String(product.data.price ?? ''))
        setIsLoaded(true)
      })
      return () => {
        active = false
      }
    }, [id]),
  )

  const handleSave = async () => {
    await updateLocalProduct(id, {
      title: title.trim(),
      price: price ? Number(price) : undefined,
    })
    router.back()
  }

  const handleDelete = () => {
    Alert.alert('Delete product?', 'This will be removed once synced.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteLocalProduct(id)
          router.back()
        },
      },
    ])
  }

  if (!isLoaded) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="#8a8a8e" />

      <Text style={styles.label}>Price</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholderTextColor="#8a8a8e"
      />

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>
      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete product</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingTop: 70 },
  label: { color: '#9a9a9e', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 15,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  saveText: { color: '#000', fontWeight: '700', fontSize: 15 },
  deleteButton: { alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 10 },
  deleteText: { color: '#ff6b6b', fontWeight: '600', fontSize: 14 },
})
