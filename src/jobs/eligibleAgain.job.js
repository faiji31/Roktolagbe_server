import { collections } from "../config/db.js";
import { DEFAULT_ELIGIBILITY_GAP_DAYS } from "../utils/constants.js";
import { createBulkNotifications } from "../modules/notifications/notification.service.js";

export async function runEligibleAgainJob() {
  const settings = await collections
    .settings()
    .findOne({ key: "platform_rules" });
  const gapDays = settings?.eligibilityGapDays || DEFAULT_ELIGIBILITY_GAP_DAYS;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - gapDays);

  // Find donors whose cooldown ended and who haven't been notified for this cycle
  const newlyEligibleDonors = await collections
    .donorProfiles()
    .find({
      lastDonatedAt: { $ne: null, $lte: cutoffDate },
      $expr: { $ne: ["$notifiedForDonationAt", "$lastDonatedAt"] },
    })
    .limit(100)
    .toArray();

  if (!newlyEligibleDonors.length) return;

  const notifications = newlyEligibleDonors.map((donor) => ({
    userId: donor.userId,
    title: "You are eligible to donate blood again!",
    message: `It has been ${gapDays} days since your last donation. Update your availability to help patients near ${
      donor.location?.district || "you"
    }.`,
    type: "eligible",
    link: "/dashboard/profile",
  }));

  await createBulkNotifications(notifications);

  for (const donor of newlyEligibleDonors) {
    await collections.donorProfiles().updateOne(
      { _id: donor._id },
      { $set: { notifiedForDonationAt: donor.lastDonatedAt } }
    );
  }

  console.log(
    `[Cron] Sent eligibility reminders to ${newlyEligibleDonors.length} donors.`
  );
}