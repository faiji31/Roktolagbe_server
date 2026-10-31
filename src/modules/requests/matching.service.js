import { collections } from "../../config/db.js";
import { getCompatibleDonorGroups } from "../../utils/bloodCompatibility.js";
import { DEFAULT_ELIGIBILITY_GAP_DAYS } from "../../utils/constants.js";
import { createBulkNotifications } from "../notifications/notification.service.js";

export async function findMatchingDonorsForRequest(requestDoc, limit = 50) {
  const settings = await collections
    .settings()
    .findOne({ key: "platform_rules" });
  const gapDays = settings?.eligibilityGapDays || DEFAULT_ELIGIBILITY_GAP_DAYS;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - gapDays);

  const compatibleGroups = getCompatibleDonorGroups(requestDoc.bloodGroup);

  const matchedProfiles = await collections
    .donorProfiles()
    .find({
      userId: { $ne: String(requestDoc.requesterId) },
      bloodGroup: {
        $in: compatibleGroups.length ? compatibleGroups : [requestDoc.bloodGroup],
      },
      isAvailable: true,
      "location.district": requestDoc.location.district,
      $or: [
        { lastDonatedAt: null },
        { lastDonatedAt: { $exists: false } },
        { lastDonatedAt: { $lte: cutoffDate } },
      ],
    })
    .limit(limit)
    .toArray();

  // Prioritize donors in the exact same upazila first
  return matchedProfiles.sort((a, b) => {
    const aSameUpazila =
      a.location?.upazila === requestDoc.location?.upazila ? 1 : 0;
    const bSameUpazila =
      b.location?.upazila === requestDoc.location?.upazila ? 1 : 0;
    return bSameUpazila - aSameUpazila;
  });
}

export async function notifyMatchedDonors(requestDoc) {
  const matchedDonors = await findMatchingDonorsForRequest(requestDoc, 50);
  if (!matchedDonors.length) return 0;

  const urgencyLabel =
    requestDoc.urgency === "critical"
      ? "EMERGENCY: "
      : requestDoc.urgency === "urgent"
      ? "Urgent: "
      : "";

  const notifications = matchedDonors.map((donor) => ({
    userId: donor.userId,
    title: `${urgencyLabel}${requestDoc.bloodGroup} Blood Needed in ${requestDoc.location.upazila}`,
    message: `${requestDoc.bagsNeeded} bag(s) needed at ${requestDoc.hospitalName}, ${requestDoc.location.district}. Can you help?`,
    type: "match",
    link: `/requests/${requestDoc._id}`,
  }));

  await createBulkNotifications(notifications);
  return matchedDonors.length;
}