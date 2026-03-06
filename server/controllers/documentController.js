const Template = require("../models/Template");
const Document = require("../models/Document");
const User = require("../models/User");
const Signature = require("../models/Signature");
const { ApiError, sendResponse } = require("../utils/helpers");
const cloudService = require("../services/cloudService");
const pdfService = require("../services/pdfService");
const auditService = require("../services/auditService");
const { createNotification } = require("../services/notificationService");
const { sendDocumentAssignedEmail } = require("../services/emailService");

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
    const { templateId, values } = req.body;

    const template = await Template.findById(templateId);
    if (!template || !template.isActive) throw new ApiError(404, "Template not found");

    // Fill placeholders
    let filledContent = template.content;
    for (const [key, val] of Object.entries(values || {})) {
      filledContent = filledContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
    }

    const title = `${template.title} - ${new Date().toISOString().split("T")[0]}`;

    // Generate PDF
    const pdfBuffer = await pdfService.generatePdfFromContent(title, filledContent);

    // Upload to Azure
    const filename = `${Date.now()}-${template.title.replace(/\s+/g, "_")}.pdf`;
    const { url } = await cloudService.upload(pdfBuffer, "documents", filename, "application/pdf");

    const doc = await Document.create({
      templateId,
      title,
      content: filledContent,
      pdfUrl: url,
      status: "draft",
      assignedBy: req.user._id,
      source: "template",
      metadata: { filledValues: values },
    });

    await auditService.log({
      action: "DOCUMENT_GENERATED",
      documentId: doc._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    sendResponse(res, 201, "Document generated", doc);
  } catch (err) {
    next(err);
  }
};

// POST /api/documents/create-custom
const createCustomDocument = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    // Generate PDF from raw content
    const pdfBuffer = await pdfService.generatePdfFromContent(title, content);

    const filename = `${Date.now()}-custom-${title.replace(/\s+/g, "_")}.pdf`;
    const { url } = await cloudService.upload(pdfBuffer, "documents", filename, "application/pdf");

    const doc = await Document.create({
      title,
      content,
      pdfUrl: url,
      status: "draft",
      assignedBy: req.user._id,
      source: "custom",
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

    sendResponse(res, 201, "Custom document created", doc);
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
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
    const { url } = await cloudService.upload(req.file.buffer, "documents", filename, req.file.mimetype);

    const doc = await Document.create({
      title,
      content: `[Uploaded PDF] ${req.file.originalname}`,
      pdfUrl: url,
      status: "draft",
      assignedBy: req.user._id,
      source: "upload",
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

    sendResponse(res, 201, "Document uploaded", doc);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents
const getDocuments = async (req, res, next) => {
  try {
    const filter = {};

    // Regular users only see docs assigned to them
    if (req.user.role === "user") {
      filter.$or = [{ assignedTo: req.user._id }, { assignedBy: req.user._id }];
    }

    if (req.query.status) filter.status = req.query.status;

    const docs = await Document.find(filter)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .sort("-createdAt");

    sendResponse(res, 200, "Documents retrieved", docs);
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

    sendResponse(res, 200, "Document retrieved", doc);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/documents/:id/assign
const assignDocument = async (req, res, next) => {
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

    sendResponse(res, 200, "Document assigned", doc);
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

    sendResponse(res, 200, "Status updated", doc);
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

module.exports = {
  generateDocument,
  createCustomDocument,
  uploadDocument,
  getDocuments,
  getDocumentById,
  assignDocument,
  updateStatus,
  downloadDocument,
};
