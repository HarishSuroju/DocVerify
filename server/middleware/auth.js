const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const { ApiError } = require("../utils/helpers");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token required");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, "Access token expired"));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, "Invalid access token"));
    }
    next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
};

const requireUser = (req, res, next) => {
  if (req.user.role !== "user") {
    return next(new ApiError(403, "User access required"));
  }
  next();
};

module.exports = { verifyToken, requireAdmin, requireUser };
