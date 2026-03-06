const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      "USER_REGISTERED",
      "USER_LOGIN",
      "TEMPLATE_CREATED",
      "DOCUMENT_GENERATED",
      "DOCUMENT_SENT",
      "DOCUMENT_VIEWED",
      "DOCUMENT_SIGNED",
      "DOCUMENT_DOWNLOADED",
      "DOCUMENT_DELETED",
      "VERIFICATION_REVIEWED",
    ],
    required: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    default: null,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  performedByRole: {
    type: String,
    enum: ["admin", "user"],
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

auditLogSchema.index({ documentId: 1, timestamp: -1 });
auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
