import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * เข้ารหัสข้อมูลด้วย AES-256-GCM (Authenticated Encryption)
 * @param data - ข้อมูลที่ต้องการเข้ารหัส
 * @returns ข้อมูลที่เข้ารหัสแล้ว ในรูปแบบ "iv:authTag:encrypted"
 */
export function encryptData(data: string): string {
  const key = process.env.SECRET_KEY;
  if (!key || key.length !== 64) {
    throw new Error("SECRET_KEY must be 64 hex characters (32 bytes)");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    iv
  );

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get authentication tag for GCM mode
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * เข้ารหัสข้อมูลด้วย AES-256-GCM (Client-side)
 * @param data - ข้อมูลที่ต้องการเข้ารหัส
 * @param key - encryption key (hex string)
 * @returns ข้อมูลที่เข้ารหัสแล้ว ในรูปแบบ "iv:authTag:encrypted"
 */
export function encryptDataClient(data: string, key: string): string {
  if (!key || key.length !== 64) {
    throw new Error("Encryption key must be 64 hex characters (32 bytes)");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    iv
  );

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * เข้ารหัสรหัสผ่านด้วย bcrypt
 * @param password - รหัสผ่านที่ต้องการเข้ารหัส
 * @param rounds - จำนวนรอบการ hash (default: 12)
 * @returns รหัสผ่านที่เข้ารหัสแล้ว
 */
export async function hashPassword(password: string, rounds: number = 12): Promise<string> {
  return await bcrypt.hash(password, rounds);
}

/**
 * ตรวจสอบรหัสผ่านกับ hash
 * @param password - รหัสผ่าน plain text
 * @param hash - รหัสผ่านที่เข้ารหัสแล้ว
 * @returns true ถ้าตรงกัน, false ถ้าไม่ตรงกัน
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * ถอดรหัสข้อมูลที่เข้ารหัสด้วย AES-256-GCM
 * @param encryptedData - ข้อมูลที่เข้ารหัส ในรูปแบบ "iv:authTag:encrypted"
 * @returns ข้อมูลที่ถอดรหัสแล้ว
 */
export function decryptData(encryptedData: string): string {
  const key = process.env.SECRET_KEY;
  if (!key || key.length !== 64) {
    throw new Error("SECRET_KEY must be 64 hex characters (32 bytes)");
  }

  const parts = encryptedData.split(":");
  
  // Support both old CBC format (2 parts) and new GCM format (3 parts) for migration
  if (parts.length === 2) {
    // Legacy CBC decryption
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
  
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    iv
  );
  
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
