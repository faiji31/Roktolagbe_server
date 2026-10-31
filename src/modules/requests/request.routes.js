import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validate } from "../../middleware/validate.js";
import {
  createRequestLimiter,
  revealContactLimiter,
} from "../../middleware/rateLimit.js";
import {
  createRequestSchema,
  respondRequestSchema,
  updateRequestStatusSchema,
} from "./request.validation.js";
import {
  createRequest,
  listRequests,
  getMyRequests,
  getRequestDetails,
  respondRequest,
  revealContact,
  changeRequestStatus,
} from "./request.controller.js";
import { env } from "../../config/env.js";

const router = Router();

// Optional auth middleware for GET /:id so owners/donors see extra context
async function optionalAuth(req, _res, next) {
  const cookieHeader = req.headers.cookie || "";
  if (!cookieHeader) return next();
  try {
    const response = await fetch(env.authSessionUrl, {
      method: "GET",
      headers: { cookie: cookieHeader },
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.user) req.user = data.user;
    }
  } catch {
    // Proceed as guest
  }
  next();
}

router.get("/", listRequests);
router.get("/mine", requireAuth, getMyRequests);
router.get("/:id", optionalAuth, getRequestDetails);

router.post(
  "/",
  requireAuth,
  createRequestLimiter,
  validate(createRequestSchema),
  createRequest
);

router.post(
  "/:id/respond",
  requireAuth,
  validate(respondRequestSchema),
  respondRequest
);

router.post(
  "/:id/responses/:responseId/reveal",
  requireAuth,
  revealContactLimiter,
  revealContact
);

router.patch(
  "/:id/status",
  requireAuth,
  validate(updateRequestStatusSchema),
  changeRequestStatus
);

export default router;