/**
 * Client-Side Military-Grade Encryption & Privacy Shield
 * Implements Web Crypto API AES-GCM (256-bit) with PBKDF2 Key Derivation.
 * No plaintext keys ever leave the user's browser unencrypted.
 */

import { EncryptedApiKeyData } from '../types';

// Default salt for app device-level bound encryption if user chooses standard mode
const DEFAULT_SYSTEM_SALT = 'DigAI_Apple_Security_Vault_v1_Salt_9981';

/**
 * Derives a 256-bit AES-GCM key from passphrase using PBKDF2 (100,000 iterations)
 */
export async function deriveKey(
  passphrase: string,
  saltBytes: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a Gemini API key using AES-GCM 256-bit
 */
export async function encryptApiKey(
  plainKey: string,
  customPassphrase?: string
): Promise<EncryptedApiKeyData> {
  const trimmed = plainKey.trim();
  if (!trimmed) {
    throw new Error('API Key cannot be empty');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const passphrase = customPassphrase || DEFAULT_SYSTEM_SALT;

  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(trimmed)
  );

  const ciphertextBase64 = bufferToBase64(ciphertextBuffer);
  const ivBase64 = bufferToBase64(iv.buffer);
  const saltBase64 = bufferToBase64(salt.buffer);

  return {
    ciphertext: ciphertextBase64,
    iv: ivBase64,
    salt: saltBase64,
    maskedKey: maskApiKey(trimmed),
    timestamp: Date.now(),
  };
}

/**
 * Decrypts an encrypted API key using AES-GCM 256-bit
 */
export async function decryptApiKey(
  encryptedData: { ciphertext: string; iv: string; salt: string },
  customPassphrase?: string
): Promise<string> {
  const salt = base64ToUint8Array(encryptedData.salt);
  const iv = base64ToUint8Array(encryptedData.iv);
  const ciphertext = base64ToUint8Array(encryptedData.ciphertext);
  const passphrase = customPassphrase || DEFAULT_SYSTEM_SALT;

  const key = await deriveKey(passphrase, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Masks an API key for safe display (e.g. "AIzaSy...4xK9")
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
}

/**
 * Validates Google Gemini / AI Studio API key format
 */
export function validateApiKeyFormat(key: string): { valid: boolean; reason?: string } {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Key cannot be blank' };
  }
  if (trimmed.length < 20) {
    return { valid: false, reason: 'Key appears too short (Gemini keys are typically 39 chars)' };
  }
  // Standard Google Gemini API keys start with AIzaSy...
  if (trimmed.startsWith('AIzaSy')) {
    return { valid: true };
  }
  // Allow other standard 32+ character keys in case of custom endpoints
  if (/^[a-zA-Z0-9_\-]{28,}$/.test(trimmed)) {
    return { valid: true };
  }
  return { valid: false, reason: 'Key format should start with AIzaSy... or contain standard alphanumeric tokens' };
}

/**
 * Privacy Shield: Sanitizes user prompt by stripping personal sensitive tokens,
 * emails, phone numbers, and potential credential patterns before sending to RAG or LLM.
 */
export function sanitizeQueryForPrivacy(text: string): string {
  let cleaned = text;

  // Mask email addresses: user@domain.com -> [EMAIL_REDACTED]
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

  // Mask potential API keys (AIzaSy..., sk-...)
  cleaned = cleaned.replace(/(?:AIzaSy|sk-)[a-zA-Z0-9_\-]{20,}/g, '[API_KEY_REDACTED]');

  // Mask 10-12 digit phone numbers
  cleaned = cleaned.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');

  // Mask credit card-like sequences
  cleaned = cleaned.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CARD_REDACTED]');

  return cleaned;
}

// Helpers for Uint8Array <-> Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
