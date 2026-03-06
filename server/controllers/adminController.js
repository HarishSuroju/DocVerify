const User = require("../models/User");
const Document = require("../models/Document");
const Signature = require("../models/Signature");
const AuditLog = require("../models/AuditLog");
const Verification = require("../models/Verification");
const { ApiError, sendResponse } = require("../utils/helpers");

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalDocuments, totalSigned, totalPending, recentActivity] =
      await Promise.all([
        User.countDocuments(),
        Document.countDocuments(),
        Document.countDocuments({ status: "completed" }),
        Document.countDocuments({ status: { $in: ["draft", "signed", "sent"] } }),
        AuditLog.find()
          .sort("-timestamp")
          .limit(10)
          .populate("performedBy", "name email"),
      ]);

    sendResponse(res, 200, "Dashboard data", {
      stats: { totalUsers, totalDocuments, totalSigned, totalPending },
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("name email role isVerified createdAt")
      .sort("-createdAt");
    sendResponse(res, 200, "Users retrieved", users);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) throw new ApiError(400, "Invalid role");

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select(
      "name email role"
    );
    if (!user) throw new ApiError(404, "User not found");

    sendResponse(res, 200, "Role updated", user);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.userId) filter.performedBy = req.query.userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort("-timestamp")
        .skip(skip)
        .limit(limit)
        .populate("performedBy", "name email")
        .populate("documentId", "title"),
      AuditLog.countDocuments(filter),
    ]);

    sendResponse(res, 200, "Audit logs retrieved", {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/verifications
const getVerifications = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const verifications = await Verification.find(filter)
      .populate("userId", "name email")
      .sort("-createdAt");

    sendResponse(res, 200, "Verifications retrieved", verifications);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/verifications/:id
const reviewVerification = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["verified", "rejected"].includes(status)) throw new ApiError(400, "Invalid status");

    const verification = await Verification.findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!verification) throw new ApiError(404, "Verification not found");

    // If verified, update user
    if (status === "verified") {
      await User.findByIdAndUpdate(verification.userId, { isVerified: true });
    }

    sendResponse(res, 200, "Verification reviewed", verification);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  getUsers,
  updateUserRole,
  getAuditLogs,
  getVerifications,
  reviewVerification,
};
