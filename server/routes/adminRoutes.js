const { Router } = require("express");
const {
  getDashboard,
  getUsers,
  updateUserRole,
  getAuditLogs,
  getVerifications,
  reviewVerification,
} = require("../controllers/adminController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const router = Router();

router.use(verifyToken, requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.patch("/users/:id/role", updateUserRole);
router.get("/audit-logs", getAuditLogs);
router.get("/verifications", getVerifications);
router.patch("/verifications/:id", reviewVerification);

module.exports = router;
