import { randomBytes } from 'crypto'

/** Random URL-safe secret. 24 bytes -> 32 characters. */
export function generateSecret(bytes = 24): string {
  return randomBytes(bytes).toString('base64url')
}
