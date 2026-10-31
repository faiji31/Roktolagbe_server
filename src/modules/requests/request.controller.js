import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createBloodRequest,
  listPublicRequests,
  listUserOwnRequests,
  getRequestById,
  respondToRequest,
  revealDonorContact,
  updateRequestStatus,
} from "./request.service.js";

export const createRequest = asyncHandler(async (req, res) => {
  const created = await createBloodRequest(req.user, req.body);
  res.status(201).json({
    success: true,
    message: "Blood request created and compatible donors notified.",
    data: created,
  });
});

export const listRequests = asyncHandler(async (req, res) => {
  const data = await listPublicRequests(req.query);
  res.json({
    success: true,
    data,
  });
});

export const getMyRequests = asyncHandler(async (req, res) => {
  const data = await listUserOwnRequests(req.user.id, req.query);
  res.json({
    success: true,
    data,
  });
});

export const getRequestDetails = asyncHandler(async (req, res) => {
  const data = await getRequestById(req.params.id, req.user || null);
  res.json({
    success: true,
    data,
  });
});

export const respondRequest = asyncHandler(async (req, res) => {
  const data = await respondToRequest(req.params.id, req.user, req.body);
  res.json({
    success: true,
    message: "Your response has been recorded.",
    data,
  });
});

export const revealContact = asyncHandler(async (req, res) => {
  const data = await revealDonorContact(
    req.params.id,
    req.params.responseId,
    req.user
  );
  res.json({
    success: true,
    message: "Donor contact number revealed.",
    data,
  });
});

export const changeRequestStatus = asyncHandler(async (req, res) => {
  const data = await updateRequestStatus(req.params.id, req.user, req.body);
  res.json({
    success: true,
    message: "Request status updated.",
    data,
  });
});