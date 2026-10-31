export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const ROLES = {
  USER: "user",
  BANK: "bank",
  MODERATOR: "moderator",
  ADMIN: "admin",
};

export const URGENCY_LEVELS = {
  NORMAL: "normal",
  URGENT: "urgent",
  CRITICAL: "critical",
};

export const REQUEST_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  FULFILLED: "fulfilled",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
};

export const RESPONSE_STATUS = {
  ACCEPTED: "accepted",
  DECLINED: "declined",
  DONATED: "donated",
};

export const REPORT_STATUS = {
  PENDING: "pending",
  RESOLVED: "resolved",
  DISMISSED: "dismissed",
};

export const DEFAULT_ELIGIBILITY_GAP_DAYS = 90; // 90 days (~3 months) standard whole blood gap