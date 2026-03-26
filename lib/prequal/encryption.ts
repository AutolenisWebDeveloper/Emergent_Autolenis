// AES-256-GCM field-level encryption for SSN and vendor responses.
// SSN is NEVER logged, cached, or exposed after encryption.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32 // 256-bit

function getEncryptionKey(): Buffer {
  const keyHex = process.env["PREQUAL_ENCRYPTION_KEY"]
  if (!keyHex) {
    throw new Error("PREQUAL_ENCRYPTION_KEY environment variable is required")
  }
  const key = Buffer.from(keyHex, "hex")
  if (key.length !== KEY_LENGTH) {
    throw new Error(`PREQUAL_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`)
  }
  return key
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string: iv:tag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Format: base64(iv):base64(tag):base64(ciphertext)
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

/**
 * Decrypts a value encrypted with encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format")
  }

  const [ivB64, tagB64, encryptedB64] = parts
  const iv = Buffer.from(ivB64!, "base64")
  const tag = Buffer.from(tagB64!, "base64")
  const encrypted = Buffer.from(encryptedB64!, "base64")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

/**
 * Masks the last 4 digits of an SSN for display.
 * Returns "***-**-XXXX" format.
 */
export function maskSsn(ssn: string): string {
  const digits = ssn.replace(/\D/g, "")
  if (digits.length !== 9) return "***-**-****"
  return `***-**-${digits.slice(-4)}`
}

/**
 * Encrypts an SSN after stripping formatting.
 */
export function encryptSsn(ssn: string): string {
  const digits = ssn.replace(/\D/g, "")
  if (digits.length !== 9) {
    throw new Error("SSN must be 9 digits")
  }
  return encrypt(digits)
}

/**
 * Decrypts an encrypted SSN (for vendor API calls only).
 * Returns plain 9-digit string.
 */
export function decryptSsn(encryptedSsn: string): string {
  return decrypt(encryptedSsn)
}

// Suppress unused import warning — TAG_LENGTH is part of the algorithm spec
void TAG_LENGTH
