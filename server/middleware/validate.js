const { z } = require("zod");
const { ApiError } = require("../utils/helpers");

const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    return next(new ApiError(400, message));
  }
  req.body = result.data;
  next();
};

const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

const verifyEmailOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

const resendVerificationSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const templateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  content: z.string().min(1),
});

const generateDocumentSchema = z.object({
  templateId: z.string().min(1),
  values: z.record(z.string(), z.string()).optional().default({}),
});

const createCustomDocumentSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  content: z.string().min(1),
});

const signDocumentSchema = z.object({
  signatureImage: z.string().min(1),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  resendVerificationSchema,
  refreshSchema,
  templateSchema,
  generateDocumentSchema,
  createCustomDocumentSchema,
  signDocumentSchema,
};
