import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  listMyNotifications,
  markAsRead,
  markAllAsRead,
} from "./notification.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listMyNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;