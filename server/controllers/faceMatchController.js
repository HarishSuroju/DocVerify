const { matchFaces } = require("../services/faceService");
const User = require("../models/User");
const cloudService = require("../services/cloudService");
const { ApiError, sendResponse } = require("../utils/helpers");

// POST /auth/face-match
exports.faceMatch = async (req, res, next) => {
  try {
    // livePhoto is uploaded as multipart/form-data
    const livePhotoFile = req.files?.livePhoto?.[0];
    if (!livePhotoFile) throw new ApiError(400, "Live photo is required");

    // Get current user
    const user = await User.findById(req.user._id);
    if (!user || !user.verificationImageUrl) {
      throw new ApiError(400, "Verification image not found in profile");
    }

    const livePhotoUrl = await cloudService.upload(
      livePhotoFile.buffer,
      "face-match",
      `${req.user._id}-live-${Date.now()}.jpg`,
      livePhotoFile.mimetype
    );

    const profileImageUrl = await cloudService.toAccessibleUrl(user.verificationImageUrl, 10);
    const liveImageUrl = await cloudService.toAccessibleUrl(livePhotoUrl.url, 10);

    let isIdentical;
    let confidence;
    try {
      ({ isIdentical, confidence } = await matchFaces(profileImageUrl, liveImageUrl));
    } catch (err) {
      const msg = String(err.message || "");
      if (msg.includes("AZURE_FACE_API_ENDPOINT")) {
        throw new ApiError(503, "Face verification is not configured on server");
      }
      if (msg.includes("AZURE_FACE_API_KEY")) {
        throw new ApiError(503, "Face verification API key is missing on server");
      }
      if (msg.toLowerCase().includes("face not detected")) {
        throw new ApiError(422, "Face not detected clearly. Retake photo in good lighting.");
      }
      if (msg.includes("Face API request failed")) {
        throw new ApiError(502, msg);
      }
      throw err;
    }

    const match = Boolean(isIdentical && confidence > 0.6);

    sendResponse(res, 200, "Face match processed", { match, confidence });
  } catch (err) {
    next(err);
  }
};
