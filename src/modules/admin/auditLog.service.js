import { collections } from "../../config/db.js";
import { getPagination, formatPaginatedResponse } from "../../utils/pagination.js";

export async function logAdminAction({
  actorId,
  actorName,
  action,
  targetType,
  targetId,
  details = "",
}) {
  const doc = {
    actorId: String(actorId),
    actorName: actorName || "Admin",
    action,
    targetType,
    targetId: String(targetId || ""),
    details,
    createdAt: new Date(),
  };

  await collections.auditLogs().insertOne(doc);
  return doc;
}

export async function listAuditLogs(query = {}) {
  const { page, limit, skip } = getPagination(query, 20, 100);
  const filter = {};

  if (query.action) {
    filter.action = query.action;
  }

  const [items, total] = await Promise.all([
    collections
      .auditLogs()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.auditLogs().countDocuments(filter),
  ]);

  return formatPaginatedResponse(items, total, page, limit);
}