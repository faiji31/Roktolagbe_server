import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import { REPORT_STATUS } from "../../utils/constants.js";
import { ApiError } from "../../utils/ApiError.js";
import { getPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { logAdminAction } from "../admin/auditLog.service.js";

export async function createReport(user, payload) {
  const { targetType, targetId, reason, details = "" } = payload;

  if (!targetType || !targetId || !reason) {
    throw new ApiError(400, "targetType, targetId, and reason are required.");
  }

  const doc = {
    reporterId: String(user.id),
    reporterName: user.name || "User",
    targetType, // "request" | "donor" | "user"
    targetId: String(targetId),
    reason: reason.trim(),
    details: details.trim(),
    status: REPORT_STATUS.PENDING,
    createdAt: new Date(),
  };

  const result = await collections.reports().insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function listReports(query = {}) {
  const { page, limit, skip } = getPagination(query, 15, 50);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [items, total] = await Promise.all([
    collections
      .reports()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.reports().countDocuments(filter),
  ]);

  return formatPaginatedResponse(items, total, page, limit);
}

export async function resolveReport(actor, reportId, payload) {
  if (!ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid report ID.");
  }

  const { status, resolutionNote = "", banTargetUser = false } = payload;

  if (![REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED].includes(status)) {
    throw new ApiError(400, "Status must be 'resolved' or 'dismissed'.");
  }

  const report = await collections.reports().findOneAndUpdate(
    { _id: new ObjectId(reportId) },
    {
      $set: {
        status,
        resolutionNote: resolutionNote.trim(),
        resolvedBy: String(actor.id),
        resolvedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  if (banTargetUser && report.targetId) {
    const targetFilter = ObjectId.isValid(report.targetId)
      ? { _id: new ObjectId(report.targetId) }
      : { id: report.targetId };

    await collections.users().updateOne(targetFilter, {
      $set: { isBanned: true, updatedAt: new Date() },
    });
  }

  await logAdminAction({
    actorId: actor.id,
    actorName: actor.name,
    action: `REPORT_${status.toUpperCase()}`,
    targetType: "report",
    targetId: reportId,
    details: resolutionNote || `Report marked as ${status}`,
  });

  return report;
}