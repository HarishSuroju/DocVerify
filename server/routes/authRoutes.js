const { Router } = require("express");
const multer = require("multer");
const {
	register,
	login,
	refresh,
	logout,
	getMe,
	updateProfile,
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
const { faceMatch } = require("../controllers/faceMatchController");

const router = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
});

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
router.post("/update-profile", verifyToken, upload.fields([
	{ name: "profileImage", maxCount: 1 },
	{ name: "verificationImage", maxCount: 1 }
]), updateProfile);
router.post("/face-match", verifyToken, upload.fields([{ name: "livePhoto", maxCount: 1 }]), faceMatch);

module.exports = router;
