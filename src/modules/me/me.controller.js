import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getMyProfile,
  upsertMyDonorProfile,
  toggleMyAvailability,
  getMyDonations,
  getMyMatchingRequests,
} from "./me.service.js";

export const getProfile = asyncHandler(async (req, res) => {
  const data = await getMyProfile(req.user);
  res.json({
    success: true,
    data,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await upsertMyDonorProfile(req.user, req.body);
  res.json({
    success: true,
    message: "Donor profile saved.",
    data,
  });
});

export const updateAvailability = asyncHandler(async (req, res) => {
  const data = await toggleMyAvailability(req.user, req.body.isAvailable);
  res.json({
    success: true,
    message: `Availability set to ${
      req.body.isAvailable ? "Available" : "Unavailable"
    }.`,
    data,
  });
});

export const listMyDonations = asyncHandler(async (req, res) => {
  const data = await getMyDonations(req.user, req.query);
  res.json({
    success: true,
    data,
  });
});

export const listMatchingRequests = asyncHandler(async (req, res) => {
  const data = await getMyMatchingRequests(req.user, req.query);
  res.json({
    success: true,
    data,
  });
});