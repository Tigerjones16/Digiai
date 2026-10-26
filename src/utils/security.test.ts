import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  validateApiKeyFormat,
  sanitizeQueryForPrivacy,
} from './security';

test('maskApiKey correctly masks keys', () => {
  assert.equal(maskApiKey('AIzaSyAbc123456789Xyz'), 'AIzaSy••••••••9Xyz');
  assert.equal(maskApiKey('short'), '••••••••');
  assert.equal(maskApiKey(''), '');
});

test('validateApiKeyFormat recognizes valid and invalid keys', () => {
  assert.equal(validateApiKeyFormat('AIzaSyD84931082340810283091238').valid, true);
  assert.equal(validateApiKeyFormat('abc').valid, false);
  assert.equal(validateApiKeyFormat('').valid, false);
});

test('sanitizeQueryForPrivacy redacts sensitive patterns', () => {
  const input = 'My email is user@example.com and key is AIzaSyD84931082340810283091238 call 415-555-2671';
  const cleaned = sanitizeQueryForPrivacy(input);
  assert.equal(cleaned.includes('user@example.com'), false);
  assert.equal(cleaned.includes('AIzaSyD84931082340810283091238'), false);
  assert.equal(cleaned.includes('[EMAIL_REDACTED]'), true);
  assert.equal(cleaned.includes('[API_KEY_REDACTED]'), true);
  assert.equal(cleaned.includes('[PHONE_REDACTED]'), true);
});

test('encryptApiKey and decryptApiKey roundtrip with AES-GCM', async () => {
  const secretKey = 'AIzaSyExampleRealSecretKeyForTesting12345';
  const encrypted = await encryptApiKey(secretKey, 'my-super-secret-passphrase');

  assert.ok(encrypted.ciphertext.length > 10);
  assert.ok(encrypted.iv.length > 5);
  assert.ok(encrypted.salt.length > 5);

  const decrypted = await decryptApiKey(encrypted, 'my-super-secret-passphrase');
  assert.equal(decrypted, secretKey);
});
