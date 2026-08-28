import { createVault } from "2fa-kit";

let vaultPromise = null;

// Lazily created, reused across requests — createVault itself is cheap
// (just holds the key), the actual PBKDF2/AES work happens per-call inside
// vault.encrypt/decrypt.
export function getVault() {
  const masterKey = process.env.MASTER_KEY;
  if (!masterKey) {
    throw new Error("MASTER_KEY is not set. Check your .env file (see .env.example).");
  }
  if (!vaultPromise) {
    vaultPromise = createVault(masterKey);
  }
  return vaultPromise;
}

export function getMasterKey() {
  const masterKey = process.env.MASTER_KEY;
  if (!masterKey) {
    throw new Error("MASTER_KEY is not set. Check your .env file (see .env.example).");
  }
  return masterKey;
}