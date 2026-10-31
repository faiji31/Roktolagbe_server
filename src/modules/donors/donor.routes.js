import { Router } from "express";
import { searchLimiter } from "../../middleware/rateLimit.js";
import { searchPublicDonors, getPublicDonor } from "./donor.controller.js";

const router = Router();

router.get("/", searchLimiter, searchPublicDonors);
router.get("/:id", getPublicDonor);

export default router;