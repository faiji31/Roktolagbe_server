import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createReport,
  listReports,
  resolveReport,
} from "./report.service.js";

export const submitReport = asyncHandler(async (req, res) => {
  const data = await createReport(req.user, req.body);
  res.status(201).json({
    success: true,
    message: "Report submitted to moderators for review.",
    data,
  });
});

export const getAllReports = asyncHandler(async (req, res) => {
  const data = await listReports(req.query);
  res.json({
    success: true,
    data,
  });
});

export const handleReportAction = asyncHandler(async (req, res) => {
  const data = await resolveReport(req.user, req.params.id, req.body);
  res.json({
    success: true,
    message: "Report updated.",
    data,
  });
});