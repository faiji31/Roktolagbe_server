import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  getProfile,
  updateProfile,
  updateAvailability,
  listMyDonations,
  listMatchingRequests,
} from "./me.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.patch("/availability", updateAvailability);
router.get("/donations", listMyDonations);
router.get("/matches", listMatchingRequests);

export default router;