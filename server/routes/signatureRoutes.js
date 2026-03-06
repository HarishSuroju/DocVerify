const { Router } = require("express");
const { signDocument, getSignature } = require("../controllers/signatureController");
const { verifyToken } = require("../middleware/auth");
const { validate, signDocumentSchema } = require("../middleware/validate");

const router = Router();

router.use(verifyToken);

router.post("/:documentId", validate(signDocumentSchema), signDocument);
router.get("/:documentId", getSignature);

module.exports = router;
