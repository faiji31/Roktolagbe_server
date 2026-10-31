import { Router } from "express";
import { ObjectId } from "mongodb";
import metaRoutes from "../modules/meta/meta.routes.js";
import donorRoutes from "../modules/donors/donor.routes.js";
import requestRoutes from "../modules/requests/request.routes.js";
import meRoutes from "../modules/me/me.routes.js";
import bankRoutes from "../modules/banks/bank.routes.js";
import campRoutes from "../modules/camps/camp.routes.js";
import reportRoutes from "../modules/reports/report.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import uploadRoutes from "../modules/upload/upload.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { collections } from "../config/db.js";
import { streamDonationCertificate } from "../services/certificate.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "roktolagbe-server",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Download PDF Certificate for a verified donation
router.get(
  "/donations/:id/certificate",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, "Invalid donation ID.");
    }
    const donation = await collections
      .donations()
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!donation) {
      throw new ApiError(404, "Donation record not found.");
    }

    streamDonationCertificate(donation, res);
  })
);

router.use("/meta", metaRoutes);
router.use("/donors", donorRoutes);
router.use("/requests", requestRoutes);
router.use("/me", meRoutes);
router.use("/banks", bankRoutes);
router.use("/camps", campRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/upload", uploadRoutes);
router.use("/admin", adminRoutes);

export default router;