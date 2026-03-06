const { Router } = require("express");
const { register, login, refresh, logout, getMe, verifyEmailOtp, resendVerification } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { validate, registerSchema, loginSchema, verifyEmailOtpSchema, resendVerificationSchema, refreshSchema } = require("../middleware/validate");

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/verify-email-otp", validate(verifyEmailOtpSchema), verifyEmailOtp);
router.post("/resend-verification", validate(resendVerificationSchema), resendVerification);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

module.exports = router;
