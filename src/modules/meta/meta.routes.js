import { Router } from "express";
import {
  getBloodGroups,
  getLocations,
  getPublicStats,
} from "./meta.controller.js";

const router = Router();

router.get("/blood-groups", getBloodGroups);
router.get("/locations", getLocations);
router.get("/stats", getPublicStats);

export default router;