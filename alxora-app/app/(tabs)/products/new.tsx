import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { createLocalProduct } from '../../../lib/db/products'

export default function NewProductScreen() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setIsSaving(true)
    await createLocalProduct({
      title: title.trim(),
      price: price ? Number(price) : undefined,
    })
    setIsSaving(false)
    router.back()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New product</Text>
      <Text style={styles.hint}>
        Works offline — this saves to your device now and syncs automatically once you're back online.
      </Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Product name"
        placeholderTextColor="#8a8a8e"
      />

      <Text style={styles.label}>Price</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="#8a8a8e"
      />

      <Pressable style={styles.saveButton} onPress={handleCreate} disabled={isSaving || !title.trim()}>
        <Text style={styles.saveText}>{isSaving ? 'Saving…' : 'Create product'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingTop: 70 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  hint: { color: '#8a8a8e', fontSize: 13, marginTop: 6, marginBottom: 8, lineHeight: 18 },
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
})
