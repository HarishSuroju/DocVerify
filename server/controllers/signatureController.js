const Signature = require("../models/Signature");
const Document = require("../models/Document");
const User = require("../models/User");
const { ApiError, sendResponse } = require("../utils/helpers");
const cloudService = require("../services/cloudService");
const pdfService = require("../services/pdfService");
const auditService = require("../services/auditService");
const { createNotification } = require("../services/notificationService");
const { sendDocumentSignedEmail } = require("../services/emailService");

const extractBlobNameFromUrl = (fileUrl) => {
  const parsed = new URL(fileUrl);
  const pathname = parsed.pathname.replace(/^\//, "");

  // For Azure URLs, pathname is usually <container>/<blobName>. We need only blobName.
  const pathParts = pathname.split("/");
  if (parsed.hostname.includes(".blob.core.windows.net") && pathParts.length > 1) {
    return pathParts.slice(1).join("/");
  }

  // Local fallback URLs are /uploads/<blobName>; keep the uploads/ prefix for local resolver.
  return pathname;
};

// POST /api/signatures/:documentId
const signDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { signatureImage } = req.body; // base64 PNG data URI

    const doc = await Document.findById(documentId);
    if (!doc) throw new ApiError(404, "Document not found");

    const isSender = doc.assignedBy && doc.assignedBy.equals(req.user._id);
    const isReceiver = doc.assignedTo && doc.assignedTo.equals(req.user._id);

    if (!isSender && !isReceiver) {
      throw new ApiError(403, "You are not allowed to sign this document");
    }

    const signerRole = isSender ? "sender" : "receiver";

    if (signerRole === "sender" && doc.assignedTo) {
      throw new ApiError(400, "Sender must sign before sending to receiver");
    }

    if (signerRole === "receiver") {
      const senderSignature = await Signature.findOne({ documentId, signerRole: "sender" });
      if (!senderSignature) {
        throw new ApiError(400, "Sender signature is required before receiver can sign");
      }

      if (!doc.assignedTo || !doc.assignedTo.equals(req.user._id)) {
        throw new ApiError(403, "You are not assigned to sign this document");
      }
    }

    const existing = await Signature.findOne({ documentId, signerRole });
    if (existing) throw new ApiError(400, `${signerRole === "sender" ? "Sender" : "Receiver"} already signed`);

    // Decode base64 signature to buffer
    const base64Data = signatureImage.replace(/^data:image\/png;base64,/, "");
    const sigBuffer = Buffer.from(base64Data, "base64");

    // Upload signature image
    const sigFilename = `${Date.now()}-sig-${req.user._id}.png`;
    const { url: signatureImageUrl } = await cloudService.upload(
      sigBuffer,
      "signatures",
      sigFilename,
      "image/png"
    );

    // Download original PDF, embed signature, re-upload
    const origBlobName = extractBlobNameFromUrl(doc.pdfUrl);
    const origSasUrl = await cloudService.getSasUrl(origBlobName, 5);
    const pdfResponse = await fetch(origSasUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    const signedPdfBuffer = await pdfService.embedSignatureInPdf(pdfBuffer, sigBuffer, signerRole);

    const signedFilename = `${Date.now()}-signed-${doc._id}.pdf`;
    const { url: signedPdfUrl } = await cloudService.upload(
      signedPdfBuffer,
      "signed-documents",
      signedFilename,
      "application/pdf"
    );

    // Create signature record
    const signature = await Signature.create({
      documentId,
      signedBy: req.user._id,
      signerRole,
      signatureImageUrl,
      signedPdfUrl,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Update document status + latest PDF URL so next signer signs the updated file.
    doc.pdfUrl = signedPdfUrl;
    doc.status = signerRole === "sender" ? "signed" : "completed";
    await doc.save();

    await auditService.log({
      action: "DOCUMENT_SIGNED",
      documentId: doc._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (doc.assignedBy && !doc.assignedBy.equals(req.user._id)) {
      await createNotification({
        userId: doc.assignedBy,
        type: "DOCUMENT_SIGNED",
        title: "Document Signed",
        message: `${req.user.name} signed \"${doc.title}\".`,
        metadata: { documentId: doc._id, signedBy: req.user._id },
      });

      const sender = await User.findById(doc.assignedBy).select("name email");
      if (sender?.email) {
        sendDocumentSignedEmail({
          to: sender.email,
          senderName: sender.name,
          signerName: req.user.name,
          documentTitle: doc.title,
          documentId: doc._id,
        }).catch(() => {});
      }
    }

    const signatures = await Signature.find({ documentId }).populate("signedBy", "name email");
    const senderSignature = signatures.find((s) => s.signerRole === "sender") || null;
    const receiverSignature = signatures.find((s) => s.signerRole === "receiver") || null;

    sendResponse(res, 201, "Document signed successfully", {
      signature,
      signatures: { sender: senderSignature, receiver: receiverSignature },
      document: doc,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/signatures/:documentId
const getSignature = async (req, res, next) => {
  try {
    const signatures = await Signature.find({ documentId: req.params.documentId })
      .populate("signedBy", "name email")
      .sort("signedAt");

    const senderSignature = signatures.find((s) => s.signerRole === "sender") || null;
    const receiverSignature = signatures.find((s) => s.signerRole === "receiver") || null;

    sendResponse(res, 200, "Signatures retrieved", {
      sender: senderSignature,
      receiver: receiverSignature,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { signDocument, getSignature };
