const crypto = require("crypto");
const Verification = require("../models/Verification");
const User = require("../models/User");
const cloudService = require("../services/cloudService");
const auditService = require("../services/auditService");
const { sendIdentityVerificationOtpEmail } = require("../services/emailService");
const { ApiError, sendResponse } = require("../utils/helpers");

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

// POST /api/verifications/submit
const submitVerification = async (req, res, next) => {
  try {
    const { documentType, selfieSource } = req.body;
    const docFile = req.files?.document?.[0];
    const selfieFile = req.files?.selfie?.[0] || null;

    if (!docFile) throw new ApiError(400, "Government ID document is required");
    if (selfieFile && selfieSource !== "camera") {
      throw new ApiError(400, "Selfie must be captured through camera");
    }

    const allowedDocTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowedDocTypes.includes(docFile.mimetype)) {
      throw new ApiError(400, "ID document must be JPG, PNG, or PDF");
    }

    if (selfieFile && !["image/png", "image/jpeg"].includes(selfieFile.mimetype)) {
      throw new ApiError(400, "Selfie must be JPG or PNG");
    }

    const user = await User.findById(req.user._id).select("name email");
    if (!user) throw new ApiError(404, "User not found");

    if (!req.user.isVerified) {
      throw new ApiError(400, "Verify your email before submitting identity verification");
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    const docUpload = await cloudService.upload(
      docFile.buffer,
      "verifications",
      `${req.user._id}-${Date.now()}-${docFile.originalname}`,
      docFile.mimetype
    );

    let selfieUrl = null;
    if (selfieFile) {
      const selfieUpload = await cloudService.upload(
        selfieFile.buffer,
        "verifications/selfies",
        `${req.user._id}-${Date.now()}-${selfieFile.originalname}`,
        selfieFile.mimetype
      );
      selfieUrl = selfieUpload.url;
    }

    const verification = await Verification.create({
      userId: req.user._id,
      documentType,
      documentUrl: docUpload.url,
      selfieUrl,
      otp: hashedOtp,
      otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      otpVerified: false,
      status: "pending",
    });

    sendIdentityVerificationOtpEmail(user.email, user.name, otp).catch(() => {});

    await auditService.log({
      action: "IDENTITY_VERIFICATION_SUBMITTED",
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: { verificationId: verification._id, documentType },
    });

    sendResponse(res, 201, "Verification submitted. Enter the OTP sent to your email.", {
      verificationId: verification._id,
      status: verification.status,
      otpExpiresAt: verification.otpExpiresAt,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/verifications/confirm-otp
const confirmVerificationOtp = async (req, res, next) => {
  try {
    const { verificationId, otp } = req.body;
    const verification = await Verification.findById(verificationId);

    if (!verification || !verification.userId.equals(req.user._id)) {
      throw new ApiError(404, "Verification request not found");
    }

    if (!verification.otp || !verification.otpExpiresAt || verification.otpExpiresAt <= new Date()) {
      throw new ApiError(400, "OTP expired. Please resubmit verification.");
    }

    const hashedOtp = hashOtp(otp);
    if (verification.otp !== hashedOtp) {
      throw new ApiError(400, "Invalid OTP");
    }

    verification.otpVerified = true;
    verification.otp = null;
    verification.otpExpiresAt = null;
    await verification.save();

    await auditService.log({
      action: "IDENTITY_VERIFICATION_OTP_CONFIRMED",
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: { verificationId: verification._id },
    });

    sendResponse(res, 200, "Identity verification OTP confirmed", verification);
  } catch (err) {
    next(err);
  }
};

// GET /api/verifications/me
const getMyVerifications = async (req, res, next) => {
  try {
    const verifications = await Verification.find({ userId: req.user._id })
      .sort("-createdAt")
      .select("documentType documentUrl selfieUrl status otpVerified reviewedAt createdAt");

    sendResponse(res, 200, "My verifications retrieved", verifications);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitVerification,
  confirmVerificationOtp,
  getMyVerifications,
};
