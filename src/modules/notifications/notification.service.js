import { ObjectId } from "mongodb";
import { collections } from "../../config/db.js";
import { getPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { ApiError } from "../../utils/ApiError.js";

export async function createNotification({
  userId,
  title,
  message,
  type = "general",
  link = "/dashboard/notifications",
}) {
  if (!userId) return null;

  const doc = {
    userId: String(userId),
    title,
    message,
    type, // "match" | "response" | "reveal" | "fulfilled" | "eligible" | "system"
    link,
    isRead: false,
    createdAt: new Date(),
  };

  const result = await collections.notifications().insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function createBulkNotifications(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const now = new Date();
  const docs = items.map((item) => ({
    userId: String(item.userId),
    title: item.title,
    message: item.message,
    type: item.type || "general",
    link: item.link || "/dashboard/notifications",
    isRead: false,
    createdAt: now,
  }));

  await collections.notifications().insertMany(docs, { ordered: false });
  return docs;
}

export async function getUserNotifications(userId, query = {}) {
  const { page, limit, skip } = getPagination(query, 15, 50);
  const filter = { userId: String(userId) };

  if (query.unreadOnly === "true") {
    filter.isRead = false;
  }

  const [items, total, unreadCount] = await Promise.all([
    collections
      .notifications()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collections.notifications().countDocuments(filter),
    collections
      .notifications()
      .countDocuments({ userId: String(userId), isRead: false }),
  ]);

  return {
    ...formatPaginatedResponse(items, total, page, limit),
    unreadCount,
  };
}

export async function markNotificationRead(userId, notificationId) {
  if (!ObjectId.isValid(notificationId)) {
    throw new ApiError(400, "Invalid notification ID.");
  }

  const result = await collections.notifications().findOneAndUpdate(
    { _id: new ObjectId(notificationId), userId: String(userId) },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new ApiError(404, "Notification not found.");
  }

  return result;
}

export async function markAllNotificationsRead(userId) {
  const result = await collections.notifications().updateMany(
    { userId: String(userId), isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { modifiedCount: result.modifiedCount };
}