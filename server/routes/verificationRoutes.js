const { Router } = require("express");
const multer = require("multer");
const {
  submitVerification,
  confirmVerificationOtp,
  getMyVerifications,
} = require("../controllers/verificationController");
const { verifyToken } = require("../middleware/auth");
const {
  validate,
  submitVerificationSchema,
  confirmVerificationOtpSchema,
} = require("../middleware/validate");

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(verifyToken);

router.post(
  "/submit",
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  validate(submitVerificationSchema),
  submitVerification
);
router.post("/confirm-otp", validate(confirmVerificationOtpSchema), confirmVerificationOtp);
router.get("/me", getMyVerifications);

module.exports = router;
