import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import { BLOOD_GROUPS, ROLES, REPORT_STATUS } from "../../utils/constants.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  getPagination,
  formatPaginatedResponse,
} from "../../utils/pagination.js";
import { logAdminAction } from "./auditLog.service.js";
import { createNotification } from "../notifications/notification.service.js";

export async function getAdminAnalytics() {
  const [
    totalUsers,
    totalDonors,
    totalRequests,
    totalDonations,
    totalBanks,
    pendingReports,
    bloodGroupAgg,
    requestStatusAgg,
  ] = await Promise.all([
    collections.users().countDocuments({}),
    collections.donorProfiles().countDocuments({}),
    collections.requests().countDocuments({}),
    collections.donations().countDocuments({}),
    collections.banks().countDocuments({}),
    collections.reports().countDocuments({ status: REPORT_STATUS.PENDING }),
    collections
      .donorProfiles()
      .aggregate([
        { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    collections
      .requests()
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray(),
  ]);

  const donorsByBloodGroup = BLOOD_GROUPS.map((group) => {
    const found = bloodGroupAgg.find((item) => item._id === group);
    return { bloodGroup: group, count: found ? found.count : 0 };
  });

  const requestsByStatus = requestStatusAgg.map((item) => ({
    status: item._id,
    count: item.count,
  }));

  return {
    counts: {
      totalUsers,
      totalDonors,
      totalRequests,
      totalDonations,
      totalBanks,
      pendingReports,
    },
    donorsByBloodGroup,
    requestsByStatus,
  };
}

export async function listUsersForAdmin(query = {}) {
  const { page, limit, skip } = getPagination(query, 15, 50);
  const filter = {};

  if (query.role) {
    filter.role = query.role;
  }
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search.trim(), $options: "i" } },
      { email: { $regex: query.search.trim(), $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    collections
      .users()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.users().countDocuments(filter),
  ]);

  return formatPaginatedResponse(items, total, page, limit);
}

export async function changeUserRole(actor, targetUserId, role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new ApiError(400, "Invalid role specified.");
  }

  const filter = ObjectId.isValid(targetUserId)
    ? { $or: [{ _id: new ObjectId(targetUserId) }, { id: targetUserId }] }
    : { id: targetUserId };

  const updated = await collections.users().findOneAndUpdate(
    filter,
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updated) {
    throw new ApiError(404, "User not found.");
  }

  await logAdminAction({
    actorId: actor.id,
    actorName: actor.name,
    action: "USER_ROLE_CHANGE",
    targetType: "user",
    targetId: targetUserId,
    details: `Changed role to ${role}`,
  });

  return updated;
}

export async function setUserBanStatus(actor, targetUserId, isBanned) {
  const filter = ObjectId.isValid(targetUserId)
    ? { $or: [{ _id: new ObjectId(targetUserId) }, { id: targetUserId }] }
    : { id: targetUserId };

  const updated = await collections.users().findOneAndUpdate(
    filter,
    { $set: { isBanned: Boolean(isBanned), updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updated) {
    throw new ApiError(404, "User not found.");
  }

  await logAdminAction({
    actorId: actor.id,
    actorName: actor.name,
    action: isBanned ? "USER_BANNED" : "USER_UNBANNED",
    targetType: "user",
    targetId: targetUserId,
    details: `${updated.email} ban set to ${Boolean(isBanned)}`,
  });

  return updated;
}

export async function verifyOrCreateBank(actor, payload) {
  if (!payload.bankId || !ObjectId.isValid(payload.bankId)) {
    throw new ApiError(
      400,
      "Admins and Moderators can only approve or unverify existing blood banks created by Blood Bank Staff."
    );
  }

  const now = new Date();
  const isVerified = Boolean(payload.isVerified);

  const updated = await collections.banks().findOneAndUpdate(
    { _id: new ObjectId(payload.bankId) },
    {
      $set: {
        isVerified,
        verifiedBy: String(actor.id),
        verifiedAt: isVerified ? now : null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  if (!updated) {
    throw new ApiError(404, "Blood bank not found.");
  }

  // Notify the Blood Bank Staff owner when their bank is approved or unverified
  if (updated.ownerUserId) {
    await createNotification({
      userId: updated.ownerUserId,
      title: isVerified
        ? `Blood Bank Approved: ${updated.name}`
        : `Blood Bank Approval Revoked: ${updated.name}`,
      message: isVerified
        ? `Your blood bank (${updated.name}) has been approved by ${
            actor.name || "Admin"
          } and is now visible in the public directory.`
        : `Your blood bank (${updated.name}) verification was revoked. Please contact an administrator if you have questions.`,
      type: "system",
      link: "/bank",
    }).catch(() => {});
  }

  await logAdminAction({
    actorId: actor.id,
    actorName: actor.name,
    action: isVerified ? "BANK_APPROVED" : "BANK_UNVERIFIED",
    targetType: "bank",
    targetId: payload.bankId,
    details: `${updated.name} verification set to ${isVerified}`,
  });

  return updated;
}

export async function listArticles(query = {}) {
  const filter = query.publishedOnly === "true" ? { isPublished: true } : {};
  return collections.articles().find(filter).sort({ createdAt: -1 }).toArray();
}

export async function createOrUpdateArticle(actor, payload) {
  const now = new Date();
  const slug =
    payload.slug ||
    payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const doc = {
    slug,
    title: payload.title.trim(),
    summary: payload.summary?.trim() || "",
    content: payload.content?.trim() || "",
    category: payload.category || "General",
    isPublished:
      typeof payload.isPublished === "boolean" ? payload.isPublished : true,
    updatedAt: now,
  };

  const result = await collections.articles().findOneAndUpdate(
    { slug },
    {
      $set: doc,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: "after" }
  );

  await logAdminAction({
    actorId: actor.id,
    actorName: actor.name,
    action: "ARTICLE_UPSERTED",
    targetType: "article",
    targetId: slug,
    details: doc.title,
  });

  return result;
}