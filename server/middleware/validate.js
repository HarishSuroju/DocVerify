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

const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const verifyResetOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

const resetPasswordSchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const templateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  content: z.string().min(1),
});

const generateDocumentSchema = z.object({
  templateId: z.string().min(1),
  values: z.record(z.string(), z.string()).optional().default({}),
  expiresAt: z.string().datetime().optional(),
});

const createCustomDocumentSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  content: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

const submitVerificationSchema = z.object({
  documentType: z.enum(["aadhaar", "passport", "driving_license", "other"]),
  selfieSource: z.enum(["camera"]),
});

const confirmVerificationOtpSchema = z.object({
  verificationId: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
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
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  templateSchema,
  generateDocumentSchema,
  createCustomDocumentSchema,
  submitVerificationSchema,
  confirmVerificationOtpSchema,
  signDocumentSchema,
};
