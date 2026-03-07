const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentType: {
      type: String,
      enum: ["aadhaar", "passport", "driving_license", "other"],
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
    },
    selfieUrl: {
      type: String,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

verificationSchema.index({ userId: 1 });

module.exports = mongoose.model("Verification", verificationSchema);
