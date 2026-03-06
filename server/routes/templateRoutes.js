const { Router } = require("express");
const {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} = require("../controllers/templateController");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { validate, templateSchema } = require("../middleware/validate");

const router = Router();

router.use(verifyToken); // All template routes require auth

router.get("/", getTemplates);
router.get("/:id", getTemplateById);
router.post("/", requireAdmin, validate(templateSchema), createTemplate);
router.put("/:id", requireAdmin, validate(templateSchema), updateTemplate);
router.delete("/:id", requireAdmin, deleteTemplate);

module.exports = router;
