import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * เข้ารหัสข้อมูลด้วย AES-256-CBC (Server-side only)
 * @param data - ข้อมูลที่ต้องการเข้ารหัส
 * @returns ข้อมูลที่เข้ารหัสแล้ว ในรูปแบบ "iv:encrypted"
 */
export function encryptData(data: string): string {
  const key = process.env.SECRET_KEY;
  if (!key) {
    throw new Error("SECRET_KEY not found in environment variables");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    iv
  );

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

/**
 * เข้ารหัสข้อมูลด้วย AES-256-CBC (Client-side)
 * @param data - ข้อมูลที่ต้องการเข้ารหัส
 * @param key - encryption key (hex string)
 * @returns ข้อมูลที่เข้ารหัสแล้ว ในรูปแบบ "iv:encrypted"
 */
export function encryptDataClient(data: string, key: string): string {
  if (!key) {
    throw new Error("Encryption key is required");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    iv
  );

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
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
 * ถอดรหัสข้อมูลที่เข้ารหัสด้วย AES-256-CBC
 * @param encryptedData - ข้อมูลที่เข้ารหัส ในรูปแบบ "iv:encrypted"
 * @returns ข้อมูลที่ถอดรหัสแล้ว
 */
export function decryptData(encryptedData: string): string {
  const key = process.env.SECRET_KEY;
  if (!key) {
    throw new Error("SECRET_KEY not found in environment variables");
  }

  const parts = encryptedData.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    iv
  );

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
