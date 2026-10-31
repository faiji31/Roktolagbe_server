import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getAdminAnalytics,
  listUsersForAdmin,
  changeUserRole,
  setUserBanStatus,
  verifyOrCreateBank,
  listArticles,
  createOrUpdateArticle,
} from "./admin.service.js";
import { listAuditLogs } from "./auditLog.service.js";

export const getAnalytics = asyncHandler(async (_req, res) => {
  const data = await getAdminAnalytics();
  res.json({
    success: true,
    data,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const data = await listUsersForAdmin(req.query);
  res.json({
    success: true,
    data,
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const data = await changeUserRole(req.user, req.params.id, req.body.role);
  res.json({
    success: true,
    message: "User role updated.",
    data,
  });
});

export const updateUserBan = asyncHandler(async (req, res) => {
  const data = await setUserBanStatus(
    req.user,
    req.params.id,
    req.body.isBanned
  );
  res.json({
    success: true,
    message: `User ${req.body.isBanned ? "banned" : "unbanned"}.`,
    data,
  });
});

export const manageBank = asyncHandler(async (req, res) => {
  const data = await verifyOrCreateBank(req.user, req.body);
  res.json({
    success: true,
    message: "Blood bank saved.",
    data,
  });
});

export const getPublicOrAdminArticles = asyncHandler(async (req, res) => {
  const data = await listArticles(req.query);
  res.json({
    success: true,
    data,
  });
});

export const saveArticle = asyncHandler(async (req, res) => {
  const data = await createOrUpdateArticle(req.user, req.body);
  res.json({
    success: true,
    message: "Article saved.",
    data,
  });
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const data = await listAuditLogs(req.query);
  res.json({
    success: true,
    data,
  });
});