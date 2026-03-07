const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "signed", "completed"],
      default: "draft",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      enum: ["template", "custom", "upload"],
      default: "template",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    requiresVerification: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

documentSchema.index({ assignedTo: 1, status: 1 });
documentSchema.index({ assignedBy: 1, createdAt: -1 });
documentSchema.index({ status: 1 });

module.exports = mongoose.model("Document", documentSchema);
