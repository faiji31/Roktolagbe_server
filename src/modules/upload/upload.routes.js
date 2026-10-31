import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { upload } from "../../middleware/upload.js";
import { uploadSingleImage } from "./upload.controller.js";

const router = Router();

router.post("/", requireAuth, upload.single("image"), uploadSingleImage);

export default router;