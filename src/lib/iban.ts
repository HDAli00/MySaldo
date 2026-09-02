import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.IBAN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "IBAN_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypts an IBAN for storage. Format: iv:authTag:ciphertext, all hex-encoded. */
export function encryptIban(iban: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(normalizeIban(iban), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptIban(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

export function ibanLastFour(iban: string): string {
  const normalized = normalizeIban(iban);
  return normalized.slice(-4);
}

/** Renders a masked IBAN for display, e.g. "ING ····4821". */
export function maskIban(lastFour: string, bankName = "ING"): string {
  return `${bankName} ····${lastFour}`;
}
