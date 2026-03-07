const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");

const env = require("./config/env");
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const templateRoutes = require("./routes/templateRoutes");
const documentRoutes = require("./routes/documentRoutes");
const signatureRoutes = require("./routes/signatureRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const verificationRoutes = require("./routes/verificationRoutes");

const app = express();

// --- Global Middleware ---
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rate limiting
const isProd = env.NODE_ENV === "production";

if (isProd) {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    // Auth routes have a dedicated limiter below.
    skip: (req) => req.path.startsWith("/auth"),
    message: { success: false, message: "Too many requests, please try again later" },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { success: false, message: "Too many login attempts, please try again later" },
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
}

// --- Routes ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/signatures", signatureRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/verifications", verificationRoutes);

// --- Error Handling ---
app.use(errorHandler);

// --- Start ---
const PORT = env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${env.NODE_ENV}]`);
  });
});

module.exports = app;
