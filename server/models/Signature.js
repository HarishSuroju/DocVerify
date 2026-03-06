const mongoose = require("mongoose");

const signatureSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    signerRole: {
      type: String,
      enum: ["sender", "receiver"],
      required: true,
    },
    signatureImageUrl: {
      type: String,
      required: true,
    },
    signedPdfUrl: {
      type: String,
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
    signedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

signatureSchema.index({ documentId: 1, signerRole: 1 }, { unique: true });
signatureSchema.index({ documentId: 1, signedBy: 1 }, { unique: true });

const Signature = mongoose.model("Signature", signatureSchema);

// Backward-compatible migration for old single-signature index.
mongoose.connection.once("open", async () => {
  try {
    const indexes = await Signature.collection.indexes();
    const legacyUnique = indexes.find((idx) => idx.name === "documentId_1" && idx.unique);
    if (legacyUnique) {
      await Signature.collection.dropIndex("documentId_1");
    }
  } catch {
    // Ignore index migration errors to avoid blocking startup.
  }
});

module.exports = Signature;
