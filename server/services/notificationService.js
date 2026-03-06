const Notification = require("../models/Notification");
const logger = require("../utils/logger");

const createNotification = async ({ userId, type = "SYSTEM", title, message, metadata = {} }) => {
  try {
    if (!userId || !title || !message) return null;

    return await Notification.create({
      userId,
      type,
      title,
      message,
      metadata,
    });
  } catch (error) {
    logger.error(`Notification create failed: ${error.message}`);
    return null;
  }
};

module.exports = { createNotification };
