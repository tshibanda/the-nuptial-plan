import crypto from "crypto";

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be configured for social OAuth");
  return crypto.createHash("sha256").update(secret).digest();
}

export function isEncryptedToken(value: string): boolean {
  return value.startsWith("v1.");
}

/** Encrypt an OAuth credential for storage; callers must never send this value to a client. */
export function encryptToken(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

/** Decrypt a credential inside the API process only. */
export function decryptToken(value: string): string {
  if (!isEncryptedToken(value)) {
    throw new Error("Encountered a legacy plaintext social credential after startup migration");
  }
  const [, ivText, tagText, dataText] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText!, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText!, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText!, "base64url")), decipher.final()]).toString("utf8");
}