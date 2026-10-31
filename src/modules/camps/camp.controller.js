import { asyncHandler } from "../../utils/asyncHandler.js";
import { listCamps, createCamp, registerForCamp } from "./camp.service.js";

export const getCamps = asyncHandler(async (req, res) => {
  const data = await listCamps(req.query);
  res.json({
    success: true,
    data,
  });
});

export const createNewCamp = asyncHandler(async (req, res) => {
  const data = await createCamp(req.user, req.body);
  res.status(201).json({
    success: true,
    message: "Blood donation camp published.",
    data,
  });
});

export const joinCamp = asyncHandler(async (req, res) => {
  const data = await registerForCamp(req.params.id, req.user);
  res.json({
    success: true,
    message: "Successfully registered for the blood donation camp.",
    data,
  });
});