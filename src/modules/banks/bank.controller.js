import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  listPublicBanks,
  getBankById,
  findMyBankOrNull,
  createBankForUser,
  updateBankInventory,
  recordBankDonation,
  listBankDonations,
} from "./bank.service.js";

const VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const getBanksDirectory = asyncHandler(async (req, res) => {
  const data = await listPublicBanks(req.query);
  res.json({ success: true, data });
});

export const getSingleBank = asyncHandler(async (req, res) => {
  const data = await getBankById(req.params.id);
  res.json({ success: true, data });
});

export const getMyManagedBank = asyncHandler(async (req, res) => {
  const bank = await findMyBankOrNull(req.user);

  res.json({
    success: true,
    needsSetup: !bank,
    data: bank,
  });
});

export const createBank = asyncHandler(async (req, res) => {
  const data = await createBankForUser(req.user, req.body);

  res.status(201).json({
    success: true,
    message:
      "Blood bank created! You can manage your inventory now while Admin/Moderator approval is pending.",
    needsSetup: false,
    data,
  });
});

export const updateInventory = asyncHandler(async (req, res) => {
  const rawInventory = req.body?.inventory || req.body;

  if (
    !rawInventory ||
    typeof rawInventory !== "object" ||
    Array.isArray(rawInventory)
  ) {
    throw new ApiError(400, "Invalid inventory data.");
  }

  const sanitizedInventory = {};

  for (const group of VALID_BLOOD_GROUPS) {
    if (rawInventory[group] === undefined || rawInventory[group] === "") {
      sanitizedInventory[group] = 0;
      continue;
    }

    const numQty = Number(rawInventory[group]);
    if (!Number.isInteger(numQty) || numQty < 0 || numQty > 10000) {
      throw new ApiError(400, `Invalid quantity for ${group}.`);
    }

    sanitizedInventory[group] = numQty;
  }

  const data = await updateBankInventory(req.user, sanitizedInventory);

  res.json({
    success: true,
    message: "Blood bank inventory updated.",
    data,
  });
});

export const recordWalkInDonation = asyncHandler(async (req, res) => {
  const data = await recordBankDonation(req.user, req.body);

  res.status(201).json({
    success: true,
    message: "Donation recorded and inventory incremented.",
    data,
  });
});

export const getManagedBankDonations = asyncHandler(async (req, res) => {
  const data = await listBankDonations(req.user, req.query);
  res.json({ success: true, data });
});