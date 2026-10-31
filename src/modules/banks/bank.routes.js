import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { ApiError } from "../../utils/ApiError.js";
import { ROLES } from "../../utils/constants.js";
import {
  getBanksDirectory,
  getSingleBank,
  getMyManagedBank,
  createBank,
  updateInventory,
  recordWalkInDonation,
  getManagedBankDonations,
} from "./bank.controller.js";

const router = Router();

function onlyBankStaff(req, _res, next) {
  if (!req.user || req.user.role !== ROLES.BANK) {
    return next(
      new ApiError(
        403,
        "Only Blood Bank Staff accounts can create a blood bank or manage inventory."
      )
    );
  }
  next();
}

// ---------- Bank Staff Only (must come BEFORE "/:id") ----------
router.get("/staff/me", requireAuth, onlyBankStaff, getMyManagedBank);
router.post("/", requireAuth, onlyBankStaff, createBank);
router.put("/staff/inventory", requireAuth, onlyBankStaff, updateInventory);
router.patch("/staff/inventory", requireAuth, onlyBankStaff, updateInventory);
router.get("/staff/donations", requireAuth, onlyBankStaff, getManagedBankDonations);
router.post("/staff/donations", requireAuth, onlyBankStaff, recordWalkInDonation);

// ---------- Public Directory ----------
router.get("/", getBanksDirectory);
router.get("/:id", getSingleBank);

export default router;