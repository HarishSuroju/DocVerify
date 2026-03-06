class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const sendResponse = (res, statusCode, message = "Success", data = null) => {
  res.status(statusCode).json({ success: true, message, data });
};

module.exports = { ApiError, sendResponse };
