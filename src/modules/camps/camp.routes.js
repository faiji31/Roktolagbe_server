import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { getCamps, createNewCamp, joinCamp } from "./camp.controller.js";

const router = Router();

router.get("/", getCamps);
router.post("/", requireAuth, createNewCamp);
router.post("/:id/register", requireAuth, joinCamp);

export default router;