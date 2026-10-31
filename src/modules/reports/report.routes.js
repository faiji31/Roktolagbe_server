import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { ROLES } from "../../utils/constants.js";
import {
  submitReport,
  getAllReports,
  handleReportAction,
} from "./report.controller.js";

const router = Router();

router.post("/", requireAuth, submitReport);

router.get(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN, ROLES.MODERATOR),
  getAllReports
);

router.patch(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN, ROLES.MODERATOR),
  handleReportAction
);

export default router;