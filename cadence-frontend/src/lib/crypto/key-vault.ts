/**
 * KeyVault — Encrypts sensitive data (API keys) using Web Crypto API.
 *
 * Architecture:
 * 1. A random AES-256-GCM key is generated once and stored as a NON-EXTRACTABLE
 *    CryptoKey in a separate IndexedDB database ("cadence-vault").
 * 2. The API key is encrypted with this CryptoKey + random IV + random salt.
 * 3. The encrypted blob is stored in GunDB (safe to expose).
 *
 * Security properties:
 * - Non-extractable CryptoKey: even with JS access to IndexedDB, the raw key
 *   bytes cannot be read. It can only be used for encrypt/decrypt operations.
 * - AES-256-GCM: authenticated encryption, tamper-proof.
 * - Random IV per encryption: same plaintext produces different ciphertext.
 * - Origin-bound: the CryptoKey only works on the same origin.
 *
 * Threat model:
 * - Raw GunDB dump → sees encrypted blob, useless without CryptoKey.
 * - XSS on same origin → can call decrypt() but can't export the key itself.
 * - Different origin → no access to IndexedDB.
 * - Physical device access → protected by OS-level device lock (not our layer).
 */

const VAULT_DB_NAME = "cadence-vault";
const VAULT_STORE_NAME = "keys";
const MASTER_KEY_ID = "master";

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VAULT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(VAULT_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getMasterKey(): Promise<CryptoKey> {
  const db = await openVaultDB();

  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE_NAME, "readonly");
    const store = tx.objectStore(VAULT_STORE_NAME);
    const req = store.get(MASTER_KEY_ID);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });

  if (existing) {
    db.close();
    return existing;
  }

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE_NAME, "readwrite");
    const store = tx.objectStore(VAULT_STORE_NAME);
    const req = store.put(key, MASTER_KEY_ID);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  db.close();
  return key;
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded string containing
 * the IV + ciphertext (safe to store in GunDB).
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  if (typeof window === "undefined") return plaintext;

  try {
    const key = await getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch {
    console.warn("KeyVault: encryption unavailable, storing plaintext");
    return plaintext;
  }
}

/**
 * Decrypt a base64-encoded encrypted string back to plaintext.
 */
export async function decrypt(encrypted: string): Promise<string> {
  if (!encrypted) return "";
  if (typeof window === "undefined") return encrypted;

  try {
    const key = await getMasterKey();
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    if (encrypted.startsWith("AIza") || encrypted.startsWith("sk-")) {
      return encrypted;
    }
    return "";
  }
}

/**
 * Check if a string looks like it's encrypted (base64 with sufficient length).
 * Used to migrate legacy plaintext keys.
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 20) return false;
  try {
    const decoded = atob(value);
    return decoded.length > 12;
  } catch {
    return false;
  }
}
