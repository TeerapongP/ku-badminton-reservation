import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const SALT_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = "sha256";

const MIN_SECRET_LENGTH = 32;

function getValidatedSecrets(): { secretKey: string; nextauthSecret: string } | null {
    const secretKey = process.env.SECRET_KEY;
    const nextauthSecret = process.env.NEXTAUTH_SECRET;

    if (!secretKey || !nextauthSecret) {
        // A09: log error category, not the values
        console.error("[crypto] FATAL: Missing required environment variables");
        return null;
    }

    if (secretKey.length < MIN_SECRET_LENGTH) {
        console.error(`[crypto] SECRET_KEY must be at least ${MIN_SECRET_LENGTH} characters`);
        return null;
    }

    if (nextauthSecret.length < MIN_SECRET_LENGTH) {
        console.error(`[crypto] NEXTAUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
        return null;
    }

    return { secretKey, nextauthSecret };
}

// ─── Key Derivation (A02 – Cryptographic Failures, A04 – Insecure Design) ────


async function deriveKey(salt: Buffer): Promise<Buffer | null> {
    const secrets = getValidatedSecrets();
    
    if (!secrets) {
        return null;
    }

    const { secretKey, nextauthSecret } = secrets;

    // Combine secrets with a separator to prevent length-extension issues
    const combinedSecret = `${secretKey}:${nextauthSecret}`;

    return new Promise<Buffer | null>((resolve, reject) => {
        crypto.pbkdf2(
            combinedSecret,
            salt,
            PBKDF2_ITERATIONS,
            KEY_LENGTH,
            PBKDF2_DIGEST,
            (err, derivedKey) => {
                if (err) {
                    // A09: log error type, not secret material
                    console.error("[crypto] Key derivation failed:", err.message);
                    resolve(null);
                } else {
                    resolve(derivedKey);
                }
            }
        );
    });
}

// ─── Input Validation (A03 – Injection) ──────────────────────────────────────

function validatePlaintext(value: unknown): string {
    if (typeof value !== "string") {
        throw new TypeError("Plaintext must be a string");
    }
    if (value.length === 0) {
        throw new RangeError("Plaintext must not be empty");
    }
    if (value.length > 64 * 1024) {
        // 64 KB limit — adjust per use case
        throw new RangeError("Plaintext exceeds maximum allowed size (64 KB)");
    }
    return value;
}

function validateCiphertext(value: unknown): string {
    if (typeof value !== "string") {
        throw new TypeError("Ciphertext must be a string");
    }
    // Format: <salt_hex>:<iv_hex>:<authTag_hex>:<ciphertext_hex>
    const parts = value.split(":");
    if (parts.length !== 4) {
        throw new Error("Invalid ciphertext format");
    }
    return value;
}

// ─── Encode (Encrypt) ─────────────────────────────────────────────────────────

export async function encode(plaintext: string): Promise<string> {
    const validated = validatePlaintext(plaintext);

    try {
        // A02: fresh random salt + IV per operation — prevents IV/key reuse
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);

        const key = await deriveKey(salt);
        
        if (!key) {
            throw new Error("Key derivation failed - missing environment variables");
        }

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH,
        });

        const encrypted = Buffer.concat([
            cipher.update(validated, "utf8"),
            cipher.final(),
        ]);

        const authTag = cipher.getAuthTag();

        // Format: salt:iv:authTag:ciphertext
        return [
            salt.toString("hex"),
            iv.toString("hex"),
            authTag.toString("hex"),
            encrypted.toString("hex"),
        ].join(":");
    } catch (err) {
        // A09: log without leaking plaintext
        console.error("[crypto] Encode failed:", (err as Error).message);
        throw new Error("Encryption failed");
    }
}


export async function decode(ciphertext: string): Promise<string> {
    validateCiphertext(ciphertext);

    try {
        const [saltHex, ivHex, authTagHex, encryptedHex] = ciphertext.split(":");

        const salt = Buffer.from(saltHex, "hex");
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");
        const encrypted = Buffer.from(encryptedHex, "hex");

        // Validate buffer sizes to prevent unexpected behavior
        if (
            salt.length !== SALT_LENGTH ||
            iv.length !== IV_LENGTH ||
            authTag.length !== AUTH_TAG_LENGTH
        ) {
            throw new Error("Invalid ciphertext structure");
        }

        const key = await deriveKey(salt);
        
        if (!key) {
            throw new Error("Key derivation failed - missing environment variables");
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH,
        });

        // A02: GCM auth tag validation — rejects tampered/forged ciphertexts
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(), // throws if auth tag mismatch
        ]);

        return decrypted.toString("utf8");
    } catch (err) {
        // A09: generic error — no oracle about WHY decryption failed
        console.error("[crypto] Decode failed:", (err as Error).message);
        throw new Error("Decryption failed");
    }
}