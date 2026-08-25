import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useAuth } from '../../context/AuthContext'

export default function LoginScreen() {
  const { signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setIsSubmitting(true)
    const { error: signInError } = await signInWithPassword(email.trim(), password)
    setIsSubmitting(false)
    if (signInError) setError(signInError)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alxora</Text>
      <Text style={styles.subtitle}>Sign in to your store</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8a8a8e"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8a8a8e"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#000' },
  title: { fontSize: 32, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9a9a9e', marginBottom: 32 },
  error: { color: '#ff6b6b', marginBottom: 16, fontSize: 13 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    color: '#fff',
    marginBottom: 12,
    fontSize: 15,
  },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#000', fontSize: 15, fontWeight: '700' },
})
