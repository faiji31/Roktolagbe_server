import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notification.service.js";

export const listMyNotifications = asyncHandler(async (req, res) => {
  const data = await getUserNotifications(req.user.id, req.query);
  res.json({
    success: true,
    data,
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.user.id, req.params.id);
  res.json({
    success: true,
    message: "Notification marked as read.",
    data: notification,
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsRead(req.user.id);
  res.json({
    success: true,
    message: "All notifications marked as read.",
    data: result,
  });
});