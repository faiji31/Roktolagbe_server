import { asyncHandler } from "../../utils/asyncHandler.js";
import { searchDonors, getPublicDonorById } from "./donor.service.js";

export const searchPublicDonors = asyncHandler(async (req, res) => {
  const data = await searchDonors(req.query);
  res.json({
    success: true,
    data,
  });
});

export const getPublicDonor = asyncHandler(async (req, res) => {
  const data = await getPublicDonorById(req.params.id);
  res.json({
    success: true,
    data,
  });
});