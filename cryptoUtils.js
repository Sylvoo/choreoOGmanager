/**
 * Deterministic person IDs and Unicode-safe Base64 helpers.
 */

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const cleaned = base64.replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode a Unicode string to Base64 (safe for Polish diacritics). */
export function encodeUnicodeToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}

/** Decode Base64 to a Unicode string. */
export function decodeBase64ToUnicode(base64) {
  const bytes = base64ToBytes(base64);
  return new TextDecoder().decode(bytes);
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-256 personId from normalized first name, last name, and email.
 * Expects already-normalized values joined as first|last|email.
 */
export async function createPersonId(normalizedFirst, normalizedLast, normalizedEmail) {
  const input = `${normalizedFirst}|${normalizedLast}|${normalizedEmail}`;
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
}
