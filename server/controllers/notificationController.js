const Notification = require("../models/Notification");
const { ApiError, sendResponse } = require("../utils/helpers");

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const notifications = await Notification.find({ userId: req.user._id })
      .sort("-createdAt")
      .limit(limit);

    sendResponse(res, 200, "Notifications retrieved", notifications);
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const unread = await Notification.countDocuments({ userId: req.user._id, read: false });
    sendResponse(res, 200, "Unread count retrieved", { unread });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read
const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) throw new ApiError(404, "Notification not found");
    sendResponse(res, 200, "Notification marked as read", notification);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/read-all
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    sendResponse(res, 200, "All notifications marked as read", {
      updated: result.modifiedCount || 0,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
