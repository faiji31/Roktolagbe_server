import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { ROLES } from "../../utils/constants.js";
import {
  getAnalytics,
  getUsers,
  updateUserRole,
  updateUserBan,
  manageBank,
  getPublicOrAdminArticles,
  saveArticle,
  getAuditLogs,
} from "./admin.controller.js";

const router = Router();

// Public awareness articles endpoint
router.get("/articles", getPublicOrAdminArticles);

// Protected Admin & Moderator routes
router.use(requireAuth, requireRole(ROLES.ADMIN, ROLES.MODERATOR));

router.get("/analytics", getAnalytics);
router.get("/users", getUsers);
router.patch("/users/:id/role", requireRole(ROLES.ADMIN), updateUserRole);
router.patch("/users/:id/ban", updateUserBan);
router.post("/banks", manageBank);
router.post("/articles", saveArticle);
router.get("/audit-logs", requireRole(ROLES.ADMIN), getAuditLogs);

export default router;