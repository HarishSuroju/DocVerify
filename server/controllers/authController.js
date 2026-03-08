const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const { ApiError, sendResponse } = require("../utils/helpers");
const config = require("../config/env");
const auditService = require("../services/auditService");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");
const cloudService = require("../services/cloudService");
const logger = require("../utils/logger");

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(`${token}:${config.REFRESH_TOKEN_SECRET}`).digest("hex");

const toClientUser = async (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  identityVerified: user.identityVerified,
  organization: user.organization,
  profileImageUrl: await cloudService.toAccessibleUrl(user.profileImageUrl, 60),
  verificationImageUrl: await cloudService.toAccessibleUrl(user.verificationImageUrl, 60),
  profileCompleted: user.profileCompleted,
});

const signTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.ACCESS_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: config.ACCESS_TOKEN_EXPIRY,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    subject: String(userId),
  });
  const refreshToken = jwt.sign({ id: userId }, config.REFRESH_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: config.REFRESH_TOKEN_EXPIRY,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    subject: String(userId),
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "Email already registered");

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification OTP
    const verificationOtp = generateOtp();
    const verificationToken = hashOtp(verificationOtp);
    const verificationTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      verificationToken,
      verificationTokenExpiry,
    });

    let emailSent = true;
    try {
      await sendVerificationEmail(email, name, verificationOtp);
    } catch (err) {
      emailSent = false;
      logger.error(`Failed to send verification email to ${email}: ${err.message}`);
    }

    await auditService.log({
      action: "USER_REGISTERED",
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    const msg = emailSent
      ? "Registration successful. Enter the OTP sent to your email to verify your account."
      : "Registration successful but we could not send the verification email. Please use Resend OTP to try again.";
    sendResponse(res, 201, msg, {
      user: await toClientUser(user),
      requiresEmailVerification: true,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-email-otp
const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(400, "Invalid email or OTP");

    if (user.isVerified) {
      sendResponse(res, 200, "Email already verified");
      return;
    }

    if (!user.verificationToken || !user.verificationTokenExpiry || user.verificationTokenExpiry <= new Date()) {
      throw new ApiError(400, "OTP expired. Please request a new OTP.");
    }

    const hashedOtp = hashOtp(otp);
    if (user.verificationToken !== hashedOtp) {
      throw new ApiError(400, "Invalid email or OTP");
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    sendResponse(res, 200, "Email verified successfully");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new ApiError(401, "Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new ApiError(401, "Invalid credentials");

    if (!user.isVerified) {
      const verificationOtp = generateOtp();
      user.verificationToken = hashOtp(verificationOtp);
      user.verificationTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
      await user.save();

      let otpMessage = "Please verify your email before logging in. A 6-digit OTP has been sent to your inbox.";
      try {
        await sendVerificationEmail(user.email, user.name, verificationOtp);
      } catch (emailErr) {
        logger.error(`Failed to send verification email during login for ${user.email}: ${emailErr.message}`);
        otpMessage = "Please verify your email before logging in. We could not send the OTP — please try Resend OTP.";
      }

      throw new ApiError(403, otpMessage);
    }

    const { accessToken, refreshToken } = signTokens(user._id);
    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save();

    await auditService.log({
      action: "USER_LOGIN",
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    sendResponse(res, 200, "Login successful", {
      user: await toClientUser(user),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Return a generic success for unknown emails to avoid account enumeration.
    if (!user) {
      sendResponse(res, 200, "If the account exists, a verification email has been sent.");
      return;
    }

    if (user.isVerified) {
      throw new ApiError(400, "This email is already verified. You can log in.");
    }

    const verificationOtp = generateOtp();
    user.verificationToken = hashOtp(verificationOtp);
    user.verificationTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();

    try {
      await sendVerificationEmail(user.email, user.name, verificationOtp);
      sendResponse(res, 200, "Verification OTP sent. Please check your inbox.");
    } catch (err) {
      logger.error(`Failed to resend verification email to ${user.email}: ${err.message}`);
      throw new ApiError(502, "Failed to send verification email. Please try again later.");
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Generic response to prevent account enumeration.
    if (!user) {
      sendResponse(res, 200, "If the account exists, a password reset OTP has been sent.");
      return;
    }

    const resetOtp = generateOtp();
    user.passwordResetToken = hashOtp(resetOtp);
    user.passwordResetTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, user.name, resetOtp);
    } catch (err) {
      logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
    }
    sendResponse(res, 200, "If the account exists, a password reset OTP has been sent.");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-reset-otp
const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) throw new ApiError(400, "Invalid email or OTP");

    if (!user.passwordResetToken || !user.passwordResetTokenExpiry || user.passwordResetTokenExpiry <= new Date()) {
      throw new ApiError(400, "OTP expired. Please request a new OTP.");
    }

    const hashedOtp = hashOtp(otp);
    if (user.passwordResetToken !== hashedOtp) {
      throw new ApiError(400, "Invalid email or OTP");
    }

    sendResponse(res, 200, "OTP verified successfully");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) throw new ApiError(400, "Invalid email or OTP");

    if (!user.passwordResetToken || !user.passwordResetTokenExpiry || user.passwordResetTokenExpiry <= new Date()) {
      throw new ApiError(400, "OTP expired. Please request a new OTP.");
    }

    const hashedOtp = hashOtp(otp);
    if (user.passwordResetToken !== hashedOtp) {
      throw new ApiError(400, "Invalid email or OTP");
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    user.refreshToken = null;
    await user.save();

    await auditService.log({
      action: "PASSWORD_RESET",
      performedBy: user._id,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    sendResponse(res, 200, "Password reset successful. Please log in with your new password.");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, "Refresh token required");

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET, {
        algorithms: ["HS256"],
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      });
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(payload.id);
    const incomingHash = hashRefreshToken(refreshToken);
    const matchesStoredHash = user?.refreshToken === incomingHash;
    // Backward compatibility for users who logged in before token hashing rollout.
    const matchesLegacyPlain = user?.refreshToken === refreshToken;

    if (!user || (!matchesStoredHash && !matchesLegacyPlain)) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const tokens = signTokens(user._id);
    user.refreshToken = hashRefreshToken(tokens.refreshToken);
    await user.save();

    sendResponse(res, 200, "Token refreshed", tokens);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();
    sendResponse(res, 200, "Logged out");
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  sendResponse(res, 200, "Profile retrieved", {
    ...(await toClientUser(req.user)),
    createdAt: req.user.createdAt,
  });
};

// POST /api/auth/update-profile
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");

    const nextName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const nextOrganization = typeof req.body?.organization === "string" ? req.body.organization.trim() : "";

    if (!nextName || nextName.length < 2 || nextName.length > 100) {
      throw new ApiError(400, "Name must be between 2 and 100 characters");
    }

    user.name = nextName;
    user.organization = nextOrganization.slice(0, 200);

    // Profile image upload
    const profileImageFile = req.files?.profileImage?.[0];
    if (profileImageFile) {
      const pFile = profileImageFile;
      const filename = `${user._id}-${Date.now()}-${pFile.originalname}`;
      const { url } = await cloudService.upload(pFile.buffer, "profiles", filename, pFile.mimetype);
      user.profileImageUrl = url;
    }
    const verificationImageFile = req.files?.verificationImage?.[0];
    if (verificationImageFile && user.verificationImageUrl) {
      throw new ApiError(400, "Verification image can only be set once");
    }
    if (verificationImageFile) {
      const vFile = verificationImageFile;
      const vFilename = `${user._id}-verification-${Date.now()}-${vFile.originalname}`;
      const { url: vUrl } = await cloudService.upload(vFile.buffer, "verification", vFilename, vFile.mimetype);
      user.verificationImageUrl = vUrl;
    }
    if (!user.verificationImageUrl) {
      throw new ApiError(400, "Verification image capture is required for first profile update");
    }

    user.profileCompleted = Boolean(
      user.name.trim() &&
      user.organization.trim() &&
      user.verificationImageUrl
    );
    await user.save();

    sendResponse(res, 200, "Profile updated", { user: await toClientUser(user) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
  updateProfile,
};
