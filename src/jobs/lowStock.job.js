import { collections } from "../config/db.js";
import { BLOOD_GROUPS } from "../utils/constants.js";

export async function runLowStockJob() {
  const settings = await collections
    .settings()
    .findOne({ key: "platform_rules" });
  const threshold = settings?.lowStockThresholdBags ?? 5;

  const banks = await collections
    .banks()
    .find({ isVerified: true })
    .toArray();

  for (const bank of banks) {
    const lowGroups = BLOOD_GROUPS.filter(
      (group) => (bank.inventory?.[group] ?? 0) < threshold
    );

    if (lowGroups.length > 0) {
      await collections.banks().updateOne(
        { _id: bank._id },
        {
          $set: {
            lowStockGroups: lowGroups,
            lowStockCheckedAt: new Date(),
          },
        }
      );
    }
  }
}