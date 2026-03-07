const Template = require("../models/Template");
const Document = require("../models/Document");
const User = require("../models/User");
const Signature = require("../models/Signature");
const Notification = require("../models/Notification");
const { ApiError, sendResponse } = require("../utils/helpers");
const { encryptString, decryptString, encryptJson, decryptJson } = require("../utils/fieldCrypto");
const cloudService = require("../services/cloudService");
const pdfService = require("../services/pdfService");
const auditService = require("../services/auditService");
const { createNotification } = require("../services/notificationService");
const { sendDocumentAssignedEmail } = require("../services/emailService");
const { analyzeDocument } = require("../services/aiService");

const normalizeSigningMode = (value) => (value === "sender_only" ? "sender_only" : "both");

const inferExpiryDateFromValues = (values = {}) => {
  const keys = Object.keys(values || {});
  const expiryKey = keys.find((k) => /(expiry|expires|end_date|enddate|valid_until)/i.test(k));
  if (!expiryKey) return null;

  const value = String(values[expiryKey] || "").trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  return null;
};

const maybeCreateExpiryNotification = async (doc, userId) => {
  if (!doc.expiresAt) return;
  if (doc.status === "completed") return;

  const now = new Date();
  const diffMs = new Date(doc.expiresAt).getTime() - now.getTime();
  const within3Days = diffMs > 0 && diffMs <= 3 * 24 * 60 * 60 * 1000;
  if (!within3Days) return;

  const existing = await Notification.findOne({
    userId,
    type: "SYSTEM",
    "metadata.documentId": doc._id,
    "metadata.kind": "EXPIRY_REMINDER",
  }).select("_id");

  if (existing) return;

  await createNotification({
    userId,
    type: "SYSTEM",
    title: "Document Expiring Soon",
    message: `\"${doc.title}\" will expire on ${new Date(doc.expiresAt).toLocaleDateString()}.`,
    metadata: { documentId: doc._id, kind: "EXPIRY_REMINDER" },
  });
};

const toClientDocument = (doc) => {
  const base = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

  if (base.content) {
    try {
      base.content = decryptString(base.content);
    } catch {
      // Return stored value for backward compatibility if decryption fails.
    }
  }

  if (base.metadata?.encryptedFilledValues) {
    base.metadata.filledValues = decryptJson(base.metadata.encryptedFilledValues);
  }

  return base;
};

const extractBlobNameFromUrl = (fileUrl) => {
  const parsed = new URL(fileUrl);
  const pathname = parsed.pathname.replace(/^\//, "");

  // Azure URL path is usually <container>/<blobName>; keep only blobName.
  if (parsed.hostname.includes(".blob.core.windows.net")) {
    const parts = pathname.split("/");
    if (parts.length > 1) return parts.slice(1).join("/");
  }

  // Local fallback is /uploads/<blobName>; preserve full path segment.
  return pathname;
};

// POST /api/documents/generate
const generateDocument = async (req, res, next) => {
  try {
    const { templateId, values, expiresAt, signingMode } = req.body;

    const template = await Template.findById(templateId);
    if (!template || !template.isActive) throw new ApiError(404, "Template not found");

    // Fill placeholders
    let filledContent = template.content;
    for (const [key, val] of Object.entries(values || {})) {
      filledContent = filledContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
    }

    const title = `${template.title} - ${new Date().toISOString().split("T")[0]}`;

    // Generate PDF
    const { pdfBuffer, signatureAnchors } = await pdfService.generatePdfFromContent(title, filledContent);

    // Upload to Azure
    const filename = `${Date.now()}-${template.title.replace(/\s+/g, "_")}.pdf`;
    const { url } = await cloudService.upload(pdfBuffer, "documents", filename, "application/pdf");

    const doc = await Document.create({
      templateId,
      title,
      content: encryptString(filledContent),
      pdfUrl: url,
      status: "draft",
      assignedBy: req.user._id,
      source: "template",
      expiresAt: expiresAt ? new Date(expiresAt) : inferExpiryDateFromValues(values),
      metadata: {
        encryptedFilledValues: encryptJson(values || {}),
        signatureAnchors,
        signingMode: normalizeSigningMode(signingMode),
      },
    });

    await auditService.log({
      action: "DOCUMENT_GENERATED",
      documentId: doc._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    sendResponse(res, 201, "Document generated", toClientDocument(doc));
  } catch (err) {
    next(err);
  }
};

// POST /api/documents/create-custom
const createCustomDocument = async (req, res, next) => {
  try {
    const { title, content, expiresAt, signingMode } = req.body;

    // Generate PDF from raw content
    const { pdfBuffer, signatureAnchors } = await pdfService.generatePdfFromContent(title, content);

    const filename = `${Date.now()}-custom-${title.replace(/\s+/g, "_")}.pdf`;
    const { url } = await cloudService.upload(pdfBuffer, "documents", filename, "application/pdf");

    const doc = await Document.create({
      title,
      content: encryptString(content),
      pdfUrl: url,
      status: "draft",
      assignedBy: req.user._id,
      source: "custom",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      metadata: {
        signatureAnchors,
        signingMode: normalizeSigningMode(signingMode),
      },
    });

    await auditService.log({
      action: "DOCUMENT_GENERATED",
      documentId: doc._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: { source: "custom" },
    });

    sendResponse(res, 201, "Custom document created", toClientDocument(doc));
  } catch (err) {
    next(err);
  }
};

// POST /api/documents/upload
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, "PDF file is required");

    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new ApiError(400, "Only PDF files are allowed");
    }

    const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, "");
    const signingMode = normalizeSigningMode(req.body.signingMode);
    const expiryDate = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    if (expiryDate && Number.isNaN(expiryDate.getTime())) {
      throw new ApiError(400, "Invalid expiresAt date");
    }
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
    const { url } = await cloudService.upload(req.file.buffer, "documents", filename, req.file.mimetype);

    const doc = await Document.create({
      title,
      content: encryptString(`[Uploaded PDF] ${req.file.originalname}`),
      pdfUrl: url,
      status: "draft",
      assignedBy: req.user._id,
      source: "upload",
      expiresAt: expiryDate,
      metadata: {
        signingMode,
      },
    });

    await auditService.log({
      action: "DOCUMENT_GENERATED",
      documentId: doc._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: { source: "upload", originalName: req.file.originalname },
    });

    sendResponse(res, 201, "Document uploaded", toClientDocument(doc));
  } catch (err) {
    next(err);
  }
};

// GET /api/documents
const getDocuments = async (req, res, next) => {
  try {
    const filter = {};
    const now = new Date();
    const soonCutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Regular users only see docs assigned to them
    if (req.user.role === "user") {
      filter.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }];
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.title = { $regex: req.query.search.trim(), $options: "i" };
    }

    if (req.query.expiryFilter) {
      switch (req.query.expiryFilter) {
        case "expiring-soon":
          filter.expiresAt = { $ne: null, $gt: now, $lte: soonCutoff };
          break;
        case "expired":
          filter.expiresAt = { $ne: null, $lte: now };
          break;
        case "no-expiry":
          filter.expiresAt = null;
          break;
        case "has-expiry":
          filter.expiresAt = { $ne: null };
          break;
        default:
          break;
      }
    }

    const sortMap = {
      created_desc: { createdAt: -1 },
      created_asc: { createdAt: 1 },
      expires_asc: { expiresAt: 1, createdAt: -1 },
      expires_desc: { expiresAt: -1, createdAt: -1 },
    };
    const sort = sortMap[req.query.sort] || sortMap.created_desc;

    const docs = await Document.find(filter)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .sort(sort);

    await Promise.all(
      docs.map(async (doc) => {
        if (req.user.role === "admin") {
          if (doc.assignedBy?._id) await maybeCreateExpiryNotification(doc, doc.assignedBy._id);
          if (doc.assignedTo?._id) await maybeCreateExpiryNotification(doc, doc.assignedTo._id);
          return;
        }

        await maybeCreateExpiryNotification(doc, req.user._id);
      })
    );

    sendResponse(res, 200, "Documents retrieved", docs.map(toClientDocument));
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id
const getDocumentById = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("templateId", "title")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    if (!doc) throw new ApiError(404, "Document not found");

    // Access check for regular users
    if (
      req.user.role === "user" &&
      !doc.assignedTo?._id.equals(req.user._id) &&
      !doc.assignedBy._id.equals(req.user._id)
    ) {
      throw new ApiError(403, "Access denied");
    }

    sendResponse(res, 200, "Document retrieved", toClientDocument(doc));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/documents/:id/assign
const assignDocument = async (req, res, next) => {
      const signingMode = normalizeSigningMode(doc.metadata?.signingMode);
      if (signingMode === "sender_only") {
        throw new ApiError(400, "This agreement is configured as sender-only and does not require receiver signature");
      }

  try {
    const { assignTo } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) throw new ApiError(404, "Document not found");

    if (!doc.assignedBy.equals(req.user._id)) {
      throw new ApiError(403, "Only the sender can assign this document");
    }

    const senderSignature = await Signature.findOne({
      documentId: doc._id,
      signerRole: "sender",
    });

    if (!senderSignature) {
      throw new ApiError(400, "Sender must sign the document before sending to receiver");
    }

    const receiver = await User.findById(assignTo).select("name email role");
    if (!receiver) throw new ApiError(404, "Receiver not found");
    if (receiver.role !== "user") throw new ApiError(400, "Receiver must be a user account");
    if (receiver._id.equals(req.user._id)) throw new ApiError(400, "Sender and receiver cannot be the same user");

    doc.assignedTo = assignTo;
    doc.status = "sent";
    await doc.save();

    await auditService.log({
      action: "DOCUMENT_SENT",
      documentId: doc._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: { assignedTo: assignTo },
    });

    await createNotification({
      userId: assignTo,
      type: "DOCUMENT_SENT",
      title: "New Document Assigned",
      message: `${req.user.name} assigned \"${doc.title}\" to you for signing.`,
      metadata: { documentId: doc._id, fromUserId: req.user._id },
    });

    if (receiver?.email) {
      sendDocumentAssignedEmail({
        to: receiver.email,
        receiverName: receiver.name,
        senderName: req.user.name,
        documentTitle: doc.title,
        documentId: doc._id,
      }).catch(() => {});
    }

    sendResponse(res, 200, "Document assigned", toClientDocument(doc));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/documents/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ["draft", "sent", "viewed", "signed", "completed"];
    if (!validStatuses.includes(status)) throw new ApiError(400, "Invalid status");

    const doc = await Document.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) throw new ApiError(404, "Document not found");

    sendResponse(res, 200, "Status updated", toClientDocument(doc));
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/download
const downloadDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) throw new ApiError(404, "Document not found");

    // Generate a time-limited SAS URL
    const blobName = extractBlobNameFromUrl(doc.pdfUrl);
    const sasUrl = await cloudService.getSasUrl(blobName, 15);

    sendResponse(res, 200, "Download URL generated", { url: sasUrl });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/ai-insights
const getDocumentAiInsights = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("templateId", "title")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    if (!doc) throw new ApiError(404, "Document not found");

    if (
      req.user.role === "user" &&
      !doc.assignedTo?._id?.equals(req.user._id) &&
      !doc.assignedBy?._id?.equals(req.user._id)
    ) {
      throw new ApiError(403, "Access denied");
    }

    const clientDoc = toClientDocument(doc);

    const insights = await analyzeDocument({
      title: clientDoc.title,
      content: clientDoc.content,
      status: clientDoc.status,
      expiresAt: clientDoc.expiresAt,
    });

    doc.metadata = {
      ...(doc.metadata || {}),
      aiInsights: {
        ...insights,
        generatedAt: new Date(),
      },
    };
    await doc.save();

    sendResponse(res, 200, "AI insights generated", doc.metadata.aiInsights);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateDocument,
  createCustomDocument,
  uploadDocument,
  getDocuments,
  getDocumentById,
  assignDocument,
  updateStatus,
  downloadDocument,
  getDocumentAiInsights,
};
