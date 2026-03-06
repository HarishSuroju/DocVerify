const { Router } = require("express");
const multer = require("multer");
const {
  generateDocument,
  createCustomDocument,
  uploadDocument,
  getDocuments,
  getDocumentById,
  assignDocument,
  updateStatus,
  downloadDocument,
} = require("../controllers/documentController");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { validate, generateDocumentSchema, createCustomDocumentSchema } = require("../middleware/validate");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = Router();

router.use(verifyToken);

router.post("/generate", validate(generateDocumentSchema), generateDocument);
router.post("/create-custom", validate(createCustomDocumentSchema), createCustomDocument);
router.post("/upload", upload.single("file"), uploadDocument);
router.get("/", getDocuments);
router.get("/:id", getDocumentById);
router.get("/:id/download", downloadDocument);
router.patch("/:id/assign", assignDocument);
router.patch("/:id/status", requireAdmin, updateStatus);

module.exports = router;
