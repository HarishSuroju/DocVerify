const Template = require("../models/Template");
const { ApiError, sendResponse } = require("../utils/helpers");
const auditService = require("../services/auditService");

// Extract placeholders like {{name}}, {{date}} from content
const extractPlaceholders = (content) => {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{|\}/g, "")))];
};

// POST /api/templates — Admin only
const createTemplate = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const placeholders = extractPlaceholders(content);

    const template = await Template.create({
      title,
      content,
      placeholders,
      createdBy: req.user._id,
    });

    await auditService.log({
      action: "TEMPLATE_CREATED",
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: { templateId: template._id, title },
    });

    sendResponse(res, 201, "Template created", template);
  } catch (err) {
    next(err);
  }
};

// GET /api/templates
const getTemplates = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    const templates = await Template.find(filter)
      .select("title placeholders createdAt")
      .sort("-createdAt");

    sendResponse(res, 200, "Templates retrieved", templates);
  } catch (err) {
    next(err);
  }
};

// GET /api/templates/:id
const getTemplateById = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template || !template.isActive) throw new ApiError(404, "Template not found");
    sendResponse(res, 200, "Template retrieved", template);
  } catch (err) {
    next(err);
  }
};

// PUT /api/templates/:id — Admin only
const updateTemplate = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const update = {};
    if (title) update.title = title;
    if (content) {
      update.content = content;
      update.placeholders = extractPlaceholders(content);
    }

    const template = await Template.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!template) throw new ApiError(404, "Template not found");

    sendResponse(res, 200, "Template updated", template);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/templates/:id — Admin only (soft delete)
const deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!template) throw new ApiError(404, "Template not found");
    sendResponse(res, 200, "Template deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { createTemplate, getTemplates, getTemplateById, updateTemplate, deleteTemplate };
