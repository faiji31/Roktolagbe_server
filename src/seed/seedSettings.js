import { connectDB, collections } from "../config/db.js";

async function seedSettings() {
  await connectDB();
  await collections.settings().updateOne(
    { key: "platform_rules" },
    {
      $set: {
        key: "platform_rules",
        eligibilityGapDays: 90,
        minDonorAge: 18,
        maxDonorAge: 60,
        minDonorWeightKg: 50,
        lowStockThresholdBags: 5,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("Seeded platform settings.");
  process.exit(0);
}

seedSettings();