const { Router } = require("express");
const {
	register,
	login,
	refresh,
	logout,
	getMe,
	verifyEmailOtp,
	resendVerification,
	forgotPassword,
	verifyResetOtp,
	resetPassword,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const {
	validate,
	registerSchema,
	loginSchema,
	verifyEmailOtpSchema,
	resendVerificationSchema,
	refreshSchema,
	forgotPasswordSchema,
	verifyResetOtpSchema,
	resetPasswordSchema,
} = require("../middleware/validate");

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/verify-email-otp", validate(verifyEmailOtpSchema), verifyEmailOtp);
router.post("/resend-verification", validate(resendVerificationSchema), resendVerification);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-reset-otp", validate(verifyResetOtpSchema), verifyResetOtp);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);

module.exports = router;
