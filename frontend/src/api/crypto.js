// AES-GCM encryption utilities for client-side encryption

export async function generateKey() {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function importKey(keyData) {
  const keyBuffer = new Uint8Array(
    atob(keyData).split('').map(char => char.charCodeAt(0))
  )
  
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function exportKey(key) {
  const keyBuffer = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(keyBuffer)))
}

export async function deriveKeyFromSecret(secret) {
  // Simple key derivation from secret (in production, use proper PBKDF2/scrypt)
  const encoder = new TextEncoder()
  const secretBuffer = encoder.encode(secret.padEnd(32, '0')).slice(0, 32)
  
  return await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(key, plaintext) {
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    nonce: btoa(String.fromCharCode(...iv)),
    tag: '' // GCM includes auth tag in ciphertext
  }
}

export async function decrypt(key, ciphertextB64, nonceB64) {
  const ciphertext = new Uint8Array(
    atob(ciphertextB64).split('').map(char => char.charCodeAt(0))
  )
  const iv = new Uint8Array(
    atob(nonceB64).split('').map(char => char.charCodeAt(0))
  )
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

// Session key management
const SESSION_KEYS = new Map()

export function getSessionKey(roomId) {
  return SESSION_KEYS.get(roomId)
}

export function setSessionKey(roomId, key) {
  SESSION_KEYS.set(roomId, key)
}

export async function generateSessionKey(roomId) {
  const key = await deriveKeyFromSecret(roomId + 'encryption-salt')
  setSessionKey(roomId, key)
  return key
}
