const dotenv = require("dotenv");
dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  JWT_ISSUER: process.env.JWT_ISSUER || "verifyhub-api",
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || "verifyhub-client",
  DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY,
  DATA_ENCRYPTION_KEY_ID: process.env.DATA_ENCRYPTION_KEY_ID || "local-dev-key",
  DATA_ENCRYPTION_KEYS: process.env.DATA_ENCRYPTION_KEYS,
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER: process.env.AZURE_STORAGE_CONTAINER || "docverify",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  AI_PROVIDER: process.env.AI_PROVIDER || "heuristic",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
};

if (env.NODE_ENV === "production") {
  const requiredSecrets = [
    ["ACCESS_TOKEN_SECRET", env.ACCESS_TOKEN_SECRET],
    ["REFRESH_TOKEN_SECRET", env.REFRESH_TOKEN_SECRET],
    ["DATA_ENCRYPTION_KEY or DATA_ENCRYPTION_KEYS", env.DATA_ENCRYPTION_KEY || env.DATA_ENCRYPTION_KEYS],
  ];

  const missing = requiredSecrets.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing required production secrets: ${missing.join(", ")}`);
  }
}

module.exports = env;
