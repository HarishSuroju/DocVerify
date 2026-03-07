const crypto = require("crypto");
const env = require("../config/env");
const logger = require("./logger");

const ENCRYPTION_PREFIX_V1 = "enc:v1:";
const ENCRYPTION_PREFIX_V2 = "enc:v2:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

let warnedFallback = false;

const toBufferFromConfiguredKey = (key) => {
  if (!key) return null;

  // 64-char hex
  if (/^[a-f0-9]{64}$/i.test(key)) {
    return Buffer.from(key, "hex");
  }

  // 44-char base64 for 32 bytes (or any valid base64 yielding 32 bytes)
  try {
    const decoded = Buffer.from(key, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // ignore and continue
  }

  return null;
};

const parseKeyRing = () => {
  const ring = {};

  // Optional keyring JSON for rotation: {"key-id":"base64-or-hex-key"}
  if (env.DATA_ENCRYPTION_KEYS) {
    try {
      const parsed = JSON.parse(env.DATA_ENCRYPTION_KEYS);
      for (const [keyId, keyValue] of Object.entries(parsed || {})) {
        const keyBuffer = toBufferFromConfiguredKey(keyValue);
        if (keyBuffer) ring[keyId] = keyBuffer;
      }
    } catch {
      logger.warn("DATA_ENCRYPTION_KEYS is not valid JSON. Falling back to single key mode.");
    }
  }

  // Backward-compatible single-key mode.
  const single = toBufferFromConfiguredKey(env.DATA_ENCRYPTION_KEY);
  if (single) {
    ring[env.DATA_ENCRYPTION_KEY_ID] = single;
  }

  if (Object.keys(ring).length) {
    return {
      keyId: env.DATA_ENCRYPTION_KEY_ID,
      key: ring[env.DATA_ENCRYPTION_KEY_ID],
      ring,
    };
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Encryption key config is missing. Set DATA_ENCRYPTION_KEY or DATA_ENCRYPTION_KEYS in production.");
  }

  // Development fallback to avoid blocking local work if key is unset.
  if (!warnedFallback) {
    logger.warn("DATA_ENCRYPTION_KEY is missing/invalid. Falling back to derived dev key.");
    warnedFallback = true;
  }

  const seed = env.ACCESS_TOKEN_SECRET || "verifyhub-dev-fallback-key";
  const fallbackKey = crypto.createHash("sha256").update(seed).digest();

  return {
    keyId: "dev-fallback",
    key: fallbackKey,
    ring: { "dev-fallback": fallbackKey },
  };
};

const encryptString = (plainText) => {
  if (plainText === null || plainText === undefined) return plainText;

  const normalized = String(plainText);
  if (!normalized) return normalized;

  // Avoid double encryption.
  if (normalized.startsWith(ENCRYPTION_PREFIX_V1) || normalized.startsWith(ENCRYPTION_PREFIX_V2)) {
    return normalized;
  }

  const { keyId, key } = parseKeyRing();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64");
  return `${ENCRYPTION_PREFIX_V2}${keyId}:${payload}`;
};

const decryptString = (value) => {
  if (value === null || value === undefined) return value;

  const normalized = String(value);
  const { key, ring } = parseKeyRing();

  let payload = null;
  let decryptionKey = key;

  if (normalized.startsWith(ENCRYPTION_PREFIX_V2)) {
    const raw = normalized.slice(ENCRYPTION_PREFIX_V2.length);
    const separatorIndex = raw.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error("Invalid encrypted payload format");
    }

    const keyId = raw.slice(0, separatorIndex);
    const encoded = raw.slice(separatorIndex + 1);
    payload = Buffer.from(encoded, "base64");
    decryptionKey = ring[keyId];
    if (!decryptionKey) {
      throw new Error(`Encryption key id not available: ${keyId}`);
    }
  } else if (normalized.startsWith(ENCRYPTION_PREFIX_V1)) {
    const encoded = normalized.slice(ENCRYPTION_PREFIX_V1.length);
    payload = Buffer.from(encoded, "base64");
  } else {
    return normalized;
  }

  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + 16);
  const encrypted = payload.subarray(IV_BYTES + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, decryptionKey, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

const encryptJson = (obj) => encryptString(JSON.stringify(obj || {}));

const decryptJson = (value) => {
  if (!value) return {};

  const raw = decryptString(value);
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

module.exports = {
  encryptString,
  decryptString,
  encryptJson,
  decryptJson,
  ENCRYPTION_PREFIX_V1,
  ENCRYPTION_PREFIX_V2,
};
