import { collections } from "../config/db.js";
import { REQUEST_STATUS } from "../utils/constants.js";

export async function runExpireRequestsJob() {
  const now = new Date();

  const result = await collections.requests().updateMany(
    {
      status: { $in: [REQUEST_STATUS.OPEN, REQUEST_STATUS.IN_PROGRESS] },
      neededBy: { $lt: now },
    },
    {
      $set: {
        status: REQUEST_STATUS.EXPIRED,
        updatedAt: now,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`[Cron] Marked ${result.modifiedCount} past-due requests as expired.`);
  }
}