const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

const log = async ({ action, documentId, performedBy, performedByRole, ipAddress, userAgent, details }) => {
  try {
    await AuditLog.create({
      action,
      documentId: documentId || null,
      performedBy,
      performedByRole,
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      details: details || null,
    });
  } catch (error) {
    // Audit logging should never break the main flow
    logger.error(`Audit log failed: ${error.message}`);
  }
};

module.exports = { log };
