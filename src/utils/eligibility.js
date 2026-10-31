import { DEFAULT_ELIGIBILITY_GAP_DAYS } from "./constants.js";

export function calculateEligibleOn(lastDonatedAt, gapDays = DEFAULT_ELIGIBILITY_GAP_DAYS) {
  if (!lastDonatedAt) return null;
  const date = new Date(lastDonatedAt);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + Number(gapDays));
  return date;
}

export function isEligibleToDonate(lastDonatedAt, gapDays = DEFAULT_ELIGIBILITY_GAP_DAYS) {
  if (!lastDonatedAt) return true;
  const eligibleOn = calculateEligibleOn(lastDonatedAt, gapDays);
  if (!eligibleOn) return true;
  return new Date() >= eligibleOn;
}

export function getRemainingDaysUntilEligible(
  lastDonatedAt,
  gapDays = DEFAULT_ELIGIBILITY_GAP_DAYS
) {
  const eligibleOn = calculateEligibleOn(lastDonatedAt, gapDays);
  if (!eligibleOn) return 0;
  const diffMs = eligibleOn.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}